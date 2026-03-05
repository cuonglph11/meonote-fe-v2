import { createContext, useState, useRef, useCallback, useEffect } from 'react';
import type { FC, ReactNode } from 'react';
import type { RecordingState, RecordingStatus } from '../types';
import type { Note } from '@/shared/types';
import { api } from '@/shared/lib/api/client';
import { recordingService } from '../services/recordingService';
import { recordingManager } from '../services/recordingManager';
import { localAudioStorage } from '../services/localAudioStorage';
import { isNativePlatform } from '@/shared/lib/platform';
import { useWakeLock } from '@/shared/hooks/useWakeLock';
import { useNotes } from '@/features/notes/hooks/useNotes';
import {
  startRecordingLiveActivity,
  pauseRecordingLiveActivity,
  resumeRecordingLiveActivity,
  endRecordingLiveActivity,
  cancelRecordingLiveActivity,
  reconcileLiveActivities,
} from '../services/liveActivityService';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface RecordingContextValue {
  state: RecordingState;
  startRecording: () => Promise<'permission_denied' | 'init_failed' | 'offline' | 'started' | void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => Promise<void>;
  dismissPhoneCallWarning: () => void;
  retryUpload: (noteId: string) => Promise<boolean>;
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
  interruptionDetected: false,
  isNative: false,
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
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const storageCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isNativeRef = useRef(false);
  const durationRef = useRef(0);
  const { acquire: acquireWakeLock, release: releaseWakeLock } = useWakeLock();
  const { addPendingNote, removePendingNote, updatePendingNote, addNote } = useNotes();

  // Cleanup orphaned recording and Live Activities on mount
  useEffect(() => {
    const orphaned = recordingService.getOrphanedRecording();
    if (orphaned) {
      api.notes.delete(orphaned).catch(() => {});
      recordingService.clearOrphanedRecording();
    }
    if (isNativePlatform()) {
      recordingManager.cleanupOrphaned().catch(() => {});
    }
    reconcileLiveActivities().catch(() => {});
  }, []);

  // App state change listener: detect background/foreground transitions on native
  useEffect(() => {
    if (!isNativePlatform()) return;

    const listener = App.addListener('appStateChange', async ({ isActive: appIsActive }) => {
      if (!isNativeRef.current) return;

      if (!appIsActive) {
        recordingManager.setAppBackgrounded(true);
      } else {
        // App returning to foreground -- check if native recorder was interrupted
        recordingManager.setAppBackgrounded(false);
        const { hasInterruption } = await recordingManager.checkForInterruption();
        if (hasInterruption) {
          setState(prev => {
            if (prev.status !== 'recording') return prev;
            return {
              ...prev,
              status: 'paused',
              showPhoneCallWarning: true,
              interruptionDetected: true,
            };
          });
          pauseRecordingLiveActivity(durationRef.current).catch(() => {});
        }
      }
    });

    return () => { listener.then(l => l.remove()); };
  }, []);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setState((prev) => {
        const newDuration = prev.duration + 1;
        durationRef.current = newDuration;
        return { ...prev, duration: newDuration };
      });
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

      const dataArray = new Uint8Array(analyser.fftSize);

      levelIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        let maxDeviation = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const deviation = Math.abs(dataArray[i] - 128);
          if (deviation > maxDeviation) maxDeviation = deviation;
        }
        const avg = maxDeviation / 128;

        setState((prev) => {
          const newState = { ...prev, audioLevel: avg };

          if (avg < 0.01) {
            silentSecondsRef.current += 0.2;
          } else {
            silentSecondsRef.current = 0;
            if (prev.showNoAudioWarning) {
              newState.showNoAudioWarning = false;
            }
          }

          if (silentSecondsRef.current >= 5 && !prev.showNoAudioWarning) {
            newState.showNoAudioWarning = true;
          }

          return newState;
        });
      }, 200);
    } catch {
      // Web Audio API not available
    }
  }, []);

  const checkLowStorage = useCallback(async (): Promise<boolean> => {
    if (!navigator.storage?.estimate) return false;
    try {
      const { quota, usage } = await navigator.storage.estimate();
      if (!quota || !usage) return false;
      const remaining = quota - usage;
      return remaining < 50 * 1024 * 1024;
    } catch {
      return false;
    }
  }, []);

  const stopStorageCheck = useCallback(() => {
    if (storageCheckRef.current) {
      clearInterval(storageCheckRef.current);
      storageCheckRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!navigator.onLine) {
      return 'offline';
    }

    const useNative = isNativePlatform();
    isNativeRef.current = useNative;

    updateStatus('requesting');

    if (useNative) {
      // --- NATIVE PATH: iOS via RecorderPlugin ---
      try {
        const hasPermission = await recordingManager.checkPermissions();
        if (!hasPermission) {
          const granted = await recordingManager.requestPermissions();
          if (!granted) {
            updateStatus('idle');
            return 'permission_denied';
          }
        }

        let note: Note;
        try {
          note = await api.notes.create();
        } catch {
          updateStatus('idle');
          return 'init_failed';
        }

        recordingService.setOrphanedRecording(note.id);

        try {
          await recordingManager.start(note.id);
        } catch {
          recordingService.clearOrphanedRecording();
          api.notes.delete(note.id).catch(() => {});
          updateStatus('idle');
          return 'init_failed';
        }

        setState({
          status: 'recording',
          duration: 0,
          noteId: note.id,
          audioLevel: 0,
          showPhoneCallWarning: false,
          showLowStorageWarning: false,
          showNoAudioWarning: false,
          interruptionDetected: false,
          isNative: true,
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
        startRecordingLiveActivity({ noteId: note.id }).catch(() => {});

        return 'started';
      } catch (err) {
        // Native plugin unavailable — fall through to web path
        console.warn('[Recording] Native recorder failed, falling back to web:', err);
        isNativeRef.current = false;
        updateStatus('requesting');
      }
    }

    // --- WEB PATH: Browser via MediaRecorder ---
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

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack || audioTrack.muted || !audioTrack.enabled) {
      stream.getTracks().forEach((t) => t.stop());
      updateStatus('idle');
      return 'init_failed';
    }

    let note: Note;
    try {
      note = await api.notes.create();
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      updateStatus('idle');
      return 'init_failed';
    }

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

    mediaRecorder.start(1000);

    startAudioLevelMonitor(stream);

    audioTrackRef.current = audioTrack;
    audioTrack.addEventListener('mute', () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.pause();
        setState(prev => ({
          ...prev,
          status: 'paused',
          showPhoneCallWarning: true,
          interruptionDetected: true,
        }));
        pauseRecordingLiveActivity(durationRef.current).catch(() => {});
      }
    });
    audioTrack.addEventListener('unmute', () => {
      setState(prev => ({ ...prev, showPhoneCallWarning: false }));
    });

    const isLow = await checkLowStorage();

    storageCheckRef.current = setInterval(async () => {
      const low = await checkLowStorage();
      setState(prev => ({ ...prev, showLowStorageWarning: low }));
    }, 30_000);

    setState({
      status: 'recording',
      duration: 0,
      noteId: note.id,
      audioLevel: 0,
      showPhoneCallWarning: false,
      showLowStorageWarning: isLow,
      showNoAudioWarning: false,
      interruptionDetected: false,
      isNative: false,
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
    startRecordingLiveActivity({ noteId: note.id }).catch(() => {});

    return 'started';
  }, [updateStatus, startTimer, acquireWakeLock, addPendingNote, startAudioLevelMonitor, checkLowStorage]);

  const stopRecording = useCallback(async () => {
    const { status, duration, noteId } = state;
    if (!noteId || (status !== 'recording' && status !== 'paused')) return;

    if (duration < 10) {
      // Too short — cancel instead of saving
      stopTimer();
      stopAudioLevelMonitor();
      stopStorageCheck();
      audioTrackRef.current = null;
      cancelRecordingLiveActivity().catch(() => {});
      if (isNativeRef.current) {
        try { await recordingManager.stop(); } catch { recordingManager.reset(); }
        isNativeRef.current = false;
      } else {
        const mr = mediaRecorderRef.current;
        if (mr && mr.state !== 'inactive') { mr.onstop = null; mr.stop(); }
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      releaseWakeLock();
      recordingService.clearOrphanedRecording();
      removePendingNote(noteId);
      api.notes.delete(noteId).catch(() => {});
      setState(initialState);
      return;
    }

    updateStatus('stopping');
    stopTimer();
    stopAudioLevelMonitor();
    stopStorageCheck();
    audioTrackRef.current = null;

    endRecordingLiveActivity({ status: 'saved', seconds: duration }).catch(() => {});

    if (isNativeRef.current) {
      // --- NATIVE PATH: Stop native recording, read file, upload ---
      releaseWakeLock();

      try {
        const result = await recordingManager.stop();

        updateStatus('uploading');
        updatePendingNote(noteId, { uploading: true });

        if (result.interruption !== 'none') {
          setState(prev => ({ ...prev, interruptionDetected: true }));
        }

        // Read the recorded file from the filesystem
        let audioBlob: Blob | null = null;
        if (result.data?.path) {
          try {
            const fileResult = await Filesystem.readFile({
              path: result.data.path,
              directory: Directory.Documents,
            });
            const base64 = fileResult.data as string;
            const byteChars = atob(base64);
            const bytes = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
              bytes[i] = byteChars.charCodeAt(i);
            }
            audioBlob = new Blob([bytes], { type: 'audio/mp4' });
          } catch (readErr) {
            console.error('[Recording] Failed to read native recording file:', readErr);
          }
        }

        if (audioBlob) {
          localAudioStorage.saveAudioBlob(noteId, audioBlob).catch((err) => {
            console.warn('[Recording] Failed to save audio locally:', err);
          });

          try {
            const uploaded = await api.notes.upload(noteId, audioBlob);
            recordingService.clearOrphanedRecording();
            removePendingNote(noteId);
            addNote(uploaded);
            setState(initialState);
          } catch {
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
        } else {
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
      } catch (err) {
        console.error('[Recording] Native stop failed:', err);
        recordingManager.reset();
        recordingService.clearOrphanedRecording();
        removePendingNote(noteId);
        setState(initialState);
      }

      isNativeRef.current = false;
      return;
    }

    // --- WEB PATH: Stop MediaRecorder ---
    return new Promise<void>((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === 'inactive') { resolve(); return; }

      mr.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: recordingService.getSupportedMimeType() || 'audio/webm',
        });

        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        releaseWakeLock();

        updateStatus('uploading');
        updatePendingNote(noteId, { uploading: true });

        if (isNativePlatform()) {
          localAudioStorage.saveAudioBlob(noteId, audioBlob).catch((err) => {
            console.warn('[Recording] Failed to save audio locally:', err);
          });
        }

        try {
          const uploaded = await api.notes.upload(noteId, audioBlob);
          recordingService.clearOrphanedRecording();
          removePendingNote(noteId);
          addNote(uploaded);
          setState(initialState);
        } catch {
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
  }, [state, updateStatus, stopTimer, stopAudioLevelMonitor, stopStorageCheck, releaseWakeLock, removePendingNote, updatePendingNote, addNote]);

  const pauseRecording = useCallback(async () => {
    if (state.status !== 'recording') return;

    try {
      if (isNativeRef.current) {
        await recordingManager.pause();
      } else {
        const mr = mediaRecorderRef.current;
        if (!mr) return;
        mr.pause();
      }
      stopTimer();
      updateStatus('paused');
      pauseRecordingLiveActivity(durationRef.current).catch(() => {});
    } catch (err) {
      console.error('[Recording] Failed to pause:', err);
    }
  }, [state.status, stopTimer, updateStatus]);

  const resumeRecording = useCallback(async () => {
    if (state.status !== 'paused') return;

    try {
      if (isNativeRef.current) {
        await recordingManager.resume();
      } else {
        const mr = mediaRecorderRef.current;
        if (!mr) return;
        mr.resume();
      }
      startTimer();
      setState(prev => ({
        ...prev,
        status: 'recording',
        showPhoneCallWarning: false,
        interruptionDetected: false,
      }));
      resumeRecordingLiveActivity(state.noteId).catch(() => {});
    } catch (err) {
      console.error('[Recording] Failed to resume:', err);
    }
    setState(prev => ({
      ...prev,
      status: 'recording',
      showPhoneCallWarning: false,
      interruptionDetected: false,
    }));
    resumeRecordingLiveActivity(state.noteId).catch(() => {});
  }, [state.status, state.noteId, startTimer]);

  const cancelRecording = useCallback(async () => {
    const { noteId } = state;

    stopTimer();
    stopAudioLevelMonitor();
    stopStorageCheck();
    audioTrackRef.current = null;

    cancelRecordingLiveActivity().catch(() => {});

    if (isNativeRef.current) {
      try {
        await recordingManager.stop();
      } catch {
        recordingManager.reset();
      }
      isNativeRef.current = false;
    } else {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        mr.onstop = null;
        mr.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    releaseWakeLock();
    recordingService.clearOrphanedRecording();

    if (noteId) {
      removePendingNote(noteId);
      api.notes.delete(noteId).catch(() => {});
    }

    setState(initialState);
  }, [state, stopTimer, stopAudioLevelMonitor, stopStorageCheck, releaseWakeLock, removePendingNote]);

  const dismissPhoneCallWarning = useCallback(() => {
    setState((prev) => ({ ...prev, showPhoneCallWarning: false }));
  }, []);

  const retryUpload = useCallback(async (noteId: string): Promise<boolean> => {
    if (!isNativePlatform()) return false;

    const audioBlob = await localAudioStorage.readAudioBlob(noteId);
    if (!audioBlob) {
      console.warn('[Recording] No local audio found for retry:', noteId);
      return false;
    }

    try {
      const uploaded = await api.notes.upload(noteId, audioBlob);
      addNote(uploaded);
      return true;
    } catch (err) {
      console.error('[Recording] Retry upload failed:', err);
      return false;
    }
  }, [addNote]);

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
        retryUpload,
        isActive,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
};
