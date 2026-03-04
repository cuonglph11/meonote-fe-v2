import React, { createContext, useState, useRef, useCallback, useEffect } from 'react';
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
  showPhoneCallWarning: false,
  showLowStorageWarning: false,
};

export const RecordingContext = createContext<RecordingContextValue | null>(null);

export const RecordingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RecordingState>(initialState);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

    setState({
      status: 'recording',
      duration: 0,
      noteId: note.id,
      showPhoneCallWarning: false,
      showLowStorageWarning: false,
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
  }, [updateStatus, startTimer, acquireWakeLock, addPendingNote]);

  const stopRecording = useCallback(async () => {
    const { status, duration, noteId } = state;
    if (!noteId || (status !== 'recording' && status !== 'paused')) return;

    if (duration < 10) {
      // Return early — caller should show "too short" alert
      return;
    }

    updateStatus('stopping');
    stopTimer();

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
  }, [state, updateStatus, stopTimer, releaseWakeLock, removePendingNote, updatePendingNote, addNote]);

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
  }, [state, stopTimer, releaseWakeLock, removePendingNote]);

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
