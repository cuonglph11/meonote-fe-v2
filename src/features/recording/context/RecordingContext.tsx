import { createContext, useState, useRef, useCallback, useEffect } from 'react';
import type { FC, ReactNode } from 'react';
import type { RecordingState, RecordingStatus } from '../types';
import type { Note } from '@/shared/types';
import { api } from '@/shared/lib/api/client';
import { recordingService } from '../services/recordingService';
import { useWakeLock } from '@/shared/hooks/useWakeLock';
import { useNotes } from '@/features/notes/hooks/useNotes';

interface RecordingContextValue {
  state: RecordingState;
  startRecording: () => Promise<'permission_denied' | 'init_failed' | 'started' | void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => Promise<void>;
  dismissPhoneCallWarning: () => void;
  isActive: boolean;
}

const initialState: RecordingState = {
  status: 'idle',
  duration: 0,
  noteId: null,
  audioLevel: 0,
  showPhoneCallWarning: false,
  showLowStorageWarning: false,
  showNoAudioWarning: false,
};

export const RecordingContext = createContext<RecordingContextValue | null>(null);

export const RecordingProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RecordingState>(initialState);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silentSecondsRef = useRef(0);
  const { acquire: acquireWakeLock, release: releaseWakeLock } = useWakeLock();
  const { addPendingNote, removePendingNote, updatePendingNote, addNote } = useNotes();

  // Cleanup orphaned recording on mount
  useEffect(() => {
    const orphaned = recordingService.getOrphanedRecording();
    if (orphaned) {
      api.notes.delete(orphaned).catch(() => {});
      recordingService.clearOrphanedRecording();
    }
  }, []);

  // Handle phone call interruption (audio focus loss)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // App backgrounded — recording continues (MediaRecorder keeps recording)
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const updateStatus = useCallback((status: RecordingStatus) => {
    setState((prev) => ({ ...prev, status }));
  }, []);

  const stopAudioLevelMonitor = useCallback(() => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    silentSecondsRef.current = 0;
  }, []);

  const startAudioLevelMonitor = useCallback(async (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();

      // AudioContext may start suspended due to autoplay policy — resume it
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      silentSecondsRef.current = 0;

      // Use time-domain data for more reliable audio detection
      const dataArray = new Uint8Array(analyser.fftSize);

      levelIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Time-domain values center at 128; deviation = audio present
        let maxDeviation = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const deviation = Math.abs(dataArray[i] - 128);
          if (deviation > maxDeviation) maxDeviation = deviation;
        }
        const avg = maxDeviation / 128; // 0-1

        setState((prev) => {
          const newState = { ...prev, audioLevel: avg };

          // Track consecutive silent intervals (checked every 200ms)
          if (avg < 0.01) {
            silentSecondsRef.current += 0.2;
          } else {
            silentSecondsRef.current = 0;
            if (prev.showNoAudioWarning) {
              newState.showNoAudioWarning = false;
            }
          }

          // Warn after 5 seconds of silence
          if (silentSecondsRef.current >= 5 && !prev.showNoAudioWarning) {
            newState.showNoAudioWarning = true;
          }

          return newState;
        });
      }, 200);
    } catch {
      // Web Audio API not available — skip monitoring
    }
  }, []);

  const startRecording = useCallback(async () => {
    updateStatus('requesting');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      updateStatus('idle');
      if (err instanceof Error && err.name === 'NotAllowedError') {
        return 'permission_denied';
      }
      return 'init_failed';
    }

    // Verify audio track is functional
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack || audioTrack.muted || !audioTrack.enabled) {
      stream.getTracks().forEach((t) => t.stop());
      updateStatus('idle');
      return 'init_failed';
    }

    // Init note via API
    let note: Note;
    try {
      note = await api.notes.create();
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      updateStatus('idle');
      return 'init_failed';
    }

    // Mark as orphaned in case of force kill
    recordingService.setOrphanedRecording(note.id);

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = recordingService.getSupportedMimeType();
    const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.start(1000); // collect data every second

    // Start audio level monitoring for visual feedback
    startAudioLevelMonitor(stream);

    setState({
      status: 'recording',
      duration: 0,
      noteId: note.id,
      audioLevel: 0,
      showPhoneCallWarning: false,
      showLowStorageWarning: false,
      showNoAudioWarning: false,
    });

    addPendingNote({
      id: note.id,
      title: note.title,
      duration: 0,
      uploading: false,
      startedAt: new Date().toISOString(),
    });

    startTimer();
    acquireWakeLock();

    return 'started';
  }, [updateStatus, startTimer, acquireWakeLock, addPendingNote, startAudioLevelMonitor]);

  const stopRecording = useCallback(async () => {
    const { status, duration, noteId } = state;
    if (!noteId || (status !== 'recording' && status !== 'paused')) return;

    if (duration < 10) {
      // Return early — caller should show "too short" alert
      return;
    }

    updateStatus('stopping');
    stopTimer();
    stopAudioLevelMonitor();

    return new Promise<void>((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) { resolve(); return; }

      mr.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: recordingService.getSupportedMimeType() || 'audio/webm',
        });

        // Clean up stream
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        releaseWakeLock();

        updateStatus('uploading');
        updatePendingNote(noteId, { uploading: true });

        try {
          const uploaded = await api.notes.upload(noteId, audioBlob);
          recordingService.clearOrphanedRecording();
          removePendingNote(noteId);
          addNote(uploaded);
          setState(initialState);
        } catch {
          // Upload failed — create local failed note
          recordingService.clearOrphanedRecording();
          removePendingNote(noteId);
          addNote({
            id: noteId,
            title: `Recording ${new Date().toLocaleTimeString()}`,
            duration,
            status: 'failed',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setState(initialState);
        }

        resolve();
      };

      mr.stop();
    });
  }, [state, updateStatus, stopTimer, stopAudioLevelMonitor, releaseWakeLock, removePendingNote, updatePendingNote, addNote]);

  const pauseRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || state.status !== 'recording') return;
    mr.pause();
    stopTimer();
    updateStatus('paused');
  }, [state.status, stopTimer, updateStatus]);

  const resumeRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || state.status !== 'paused') return;
    mr.resume();
    startTimer();
    updateStatus('recording');
  }, [state.status, startTimer, updateStatus]);

  const cancelRecording = useCallback(async () => {
    const { noteId } = state;
    const mr = mediaRecorderRef.current;

    stopTimer();
    stopAudioLevelMonitor();

    if (mr && mr.state !== 'inactive') {
      mr.onstop = null;
      mr.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    releaseWakeLock();
    recordingService.clearOrphanedRecording();

    if (noteId) {
      removePendingNote(noteId);
      api.notes.delete(noteId).catch(() => {});
    }

    setState(initialState);
  }, [state, stopTimer, stopAudioLevelMonitor, releaseWakeLock, removePendingNote]);

  const dismissPhoneCallWarning = useCallback(() => {
    setState((prev) => ({ ...prev, showPhoneCallWarning: false }));
  }, []);

  const isActive = state.status !== 'idle' && state.status !== 'cancelled';

  return (
    <RecordingContext.Provider
      value={{
        state,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        cancelRecording,
        dismissPhoneCallWarning,
        isActive,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
};
