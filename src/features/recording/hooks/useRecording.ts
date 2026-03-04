import { useContext } from 'react';
import { RecordingContext } from '../context/RecordingContext';

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}
