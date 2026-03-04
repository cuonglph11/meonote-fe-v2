import type { Note } from '../types';

const CACHE_KEY = 'meonote_notes_cache';

export const notesCache = {
  get(): Note[] {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw) as Note[]) : [];
    } catch {
      return [];
    }
  },

  set(notes: Note[]): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(notes));
    } catch {
      // Storage full — ignore
    }
  },

  upsert(note: Note): void {
    const notes = this.get();
    const idx = notes.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      notes[idx] = note;
    } else {
      notes.unshift(note);
    }
    this.set(notes);
  },

  remove(id: string): void {
    const notes = this.get().filter((n) => n.id !== id);
    this.set(notes);
  },

  clear(): void {
    localStorage.removeItem(CACHE_KEY);
  },
};

export function groupNotesByDate(notes: Note[]): {
  today: Note[];
  yesterday: Note[];
  older: Note[];
} {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  const today: Note[] = [];
  const yesterday: Note[] = [];
  const older: Note[] = [];

  for (const note of notes) {
    const noteDate = new Date(note.createdAt);
    if (noteDate >= todayStart) {
      today.push(note);
    } else if (noteDate >= yesterdayStart) {
      yesterday.push(note);
    } else {
      older.push(note);
    }
  }

  return { today, yesterday, older };
}

export function filterNotes(notes: Note[], query: string): Note[] {
  if (!query.trim()) return notes;
  const q = query.toLowerCase();
  return notes.filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      (n.summarizedContent && n.summarizedContent.toLowerCase().includes(q))
  );
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
