import React from 'react';
import { SettingsProvider } from '@/features/settings/context/SettingsContext';
import { NotesProvider } from '@/features/notes/context/NotesContext';
import { RecordingProvider } from '@/features/recording/context/RecordingContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SettingsProvider>
    <NotesProvider>
      <RecordingProvider>{children}</RecordingProvider>
    </NotesProvider>
  </SettingsProvider>
);
