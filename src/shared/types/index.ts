export type NoteStatus = 'pending' | 'ready' | 'failed';

export interface Note {
  id: string;
  title: string;
  audioUrl?: string;
  duration: number; // seconds
  status: NoteStatus;
  summarizedContent?: string;
  transcription?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface PendingNote {
  id: string;
  title: string;
  duration: number;
  uploading: boolean;
  startedAt: string;
}

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'vi';

export interface AppSettings {
  theme: Theme;
  language: Language;
  onboardingCompleted: boolean;
}
