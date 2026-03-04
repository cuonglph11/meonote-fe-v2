import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Note, PendingNote } from '@/shared/types';

// ---- Mock Contexts ----

interface MockSettingsValue {
  settings?: {
    theme?: 'light' | 'dark' | 'system';
    language?: 'en' | 'vi';
    onboardingCompleted?: boolean;
  };
  userToken?: string;
  setTheme?: jest.Mock;
  setLanguage?: jest.Mock;
  completeOnboarding?: jest.Mock;
  clearAllData?: jest.Mock;
}

interface MockNotesValue {
  notes?: Note[];
  pendingNotes?: PendingNote[];
  loading?: boolean;
  error?: string | null;
  fetchNotes?: jest.Mock;
  addNote?: jest.Mock;
  updateNote?: jest.Mock;
  removeNote?: jest.Mock;
  addPendingNote?: jest.Mock;
  updatePendingNote?: jest.Mock;
  removePendingNote?: jest.Mock;
  retryNoteLoad?: jest.Mock;
}

interface MockRecordingValue {
  state?: {
    status?: 'idle' | 'requesting' | 'recording' | 'paused' | 'stopping' | 'uploading' | 'cancelled';
    duration?: number;
    noteId?: string | null;
    showPhoneCallWarning?: boolean;
    showLowStorageWarning?: boolean;
  };
  startRecording?: jest.Mock;
  stopRecording?: jest.Mock;
  pauseRecording?: jest.Mock;
  resumeRecording?: jest.Mock;
  cancelRecording?: jest.Mock;
  dismissPhoneCallWarning?: jest.Mock;
  isActive?: boolean;
}

// Mock the context hooks
const mockSettingsDefaults: Required<MockSettingsValue> = {
  settings: { theme: 'light', language: 'en', onboardingCompleted: false },
  userToken: 'test-token-abc123',
  setTheme: jest.fn(),
  setLanguage: jest.fn(),
  completeOnboarding: jest.fn(),
  clearAllData: jest.fn(),
};

const mockNotesDefaults: Required<MockNotesValue> = {
  notes: [],
  pendingNotes: [],
  loading: false,
  error: null,
  fetchNotes: jest.fn().mockResolvedValue(undefined),
  addNote: jest.fn(),
  updateNote: jest.fn(),
  removeNote: jest.fn(),
  addPendingNote: jest.fn(),
  updatePendingNote: jest.fn(),
  removePendingNote: jest.fn(),
  retryNoteLoad: jest.fn(),
};

const mockRecordingDefaults: Required<MockRecordingValue> = {
  state: {
    status: 'idle',
    duration: 0,
    noteId: null,
    showPhoneCallWarning: false,
    showLowStorageWarning: false,
  },
  startRecording: jest.fn().mockResolvedValue('started'),
  stopRecording: jest.fn().mockResolvedValue(undefined),
  pauseRecording: jest.fn(),
  resumeRecording: jest.fn(),
  cancelRecording: jest.fn().mockResolvedValue(undefined),
  dismissPhoneCallWarning: jest.fn(),
  isActive: false,
};

// We mock the hooks at module level in each test file
// This helper exports default values that tests can override

export function createMockSettings(overrides: MockSettingsValue = {}) {
  return { ...mockSettingsDefaults, ...overrides };
}

export function createMockNotes(overrides: MockNotesValue = {}) {
  return { ...mockNotesDefaults, ...overrides };
}

export function createMockRecording(overrides: MockRecordingValue = {}) {
  return {
    ...mockRecordingDefaults,
    ...overrides,
    state: { ...mockRecordingDefaults.state, ...(overrides.state || {}) },
  };
}

// Sample data factories
export function createNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Test Note',
    duration: 120,
    status: 'ready',
    summarizedContent: 'This is a summary of the test note.',
    transcription: 'This is the transcription of the test note.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTodayNote(overrides: Partial<Note> = {}): Note {
  return createNote({ createdAt: new Date().toISOString(), ...overrides });
}

export function createYesterdayNote(overrides: Partial<Note> = {}): Note {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return createNote({ createdAt: yesterday.toISOString(), ...overrides });
}

export function createOlderNote(overrides: Partial<Note> = {}): Note {
  const older = new Date();
  older.setDate(older.getDate() - 7);
  return createNote({ createdAt: older.toISOString(), ...overrides });
}

// Wrapper component for routing
export const RouterWrapper: React.FC<{ children: React.ReactNode; initialEntries?: string[] }> = ({
  children,
  initialEntries = ['/'],
}) => <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;

// Custom render with router
export function renderWithRouter(
  ui: React.ReactElement,
  options?: RenderOptions & { initialEntries?: string[] }
) {
  const { initialEntries, ...renderOptions } = options || {};
  return render(
    <MemoryRouter initialEntries={initialEntries || ['/']}>{ui}</MemoryRouter>,
    renderOptions
  );
}
