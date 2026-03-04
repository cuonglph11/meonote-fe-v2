import React, { createContext, useState, useCallback, useRef } from 'react';
import type { Note, PendingNote } from '../types';
import { api } from '@/shared/lib/api/client';
import { notesCache } from '../services/notesService';

interface NotesContextValue {
  notes: Note[];
  pendingNotes: PendingNote[];
  loading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  addNote: (note: Note) => void;
  updateNote: (id: string, data: Partial<Note>) => void;
  removeNote: (id: string) => void;
  addPendingNote: (pending: PendingNote) => void;
  updatePendingNote: (id: string, data: Partial<PendingNote>) => void;
  removePendingNote: (id: string) => void;
  retryNoteLoad: () => void;
}

export const NotesContext = createContext<NotesContextValue | null>(null);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>(() => notesCache.get());
  const [pendingNotes, setPendingNotes] = useState<PendingNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchCountRef = useRef(0);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const fetchId = ++fetchCountRef.current;
    try {
      const fetched = await api.notes.list();
      if (fetchId !== fetchCountRef.current) return;
      setNotes(fetched);
      notesCache.set(fetched);
    } catch (err) {
      if (fetchId !== fetchCountRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      if (fetchId === fetchCountRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const addNote = useCallback((note: Note) => {
    setNotes((prev) => {
      const updated = [note, ...prev.filter((n) => n.id !== note.id)];
      notesCache.set(updated);
      return updated;
    });
  }, []);

  const updateNote = useCallback((id: string, data: Partial<Note>) => {
    setNotes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, ...data } : n));
      notesCache.set(updated);
      return updated;
    });
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      notesCache.set(updated);
      return updated;
    });
  }, []);

  const addPendingNote = useCallback((pending: PendingNote) => {
    setPendingNotes((prev) => [...prev, pending]);
  }, []);

  const updatePendingNote = useCallback((id: string, data: Partial<PendingNote>) => {
    setPendingNotes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p))
    );
  }, []);

  const removePendingNote = useCallback((id: string) => {
    setPendingNotes((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const retryNoteLoad = useCallback(() => {
    fetchNotes();
  }, [fetchNotes]);

  return (
    <NotesContext.Provider
      value={{
        notes,
        pendingNotes,
        loading,
        error,
        fetchNotes,
        addNote,
        updateNote,
        removeNote,
        addPendingNote,
        updatePendingNote,
        removePendingNote,
        retryNoteLoad,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};
