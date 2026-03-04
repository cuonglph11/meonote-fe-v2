export type RecordingStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'uploading'
  | 'cancelled';

export interface RecordingState {
  status: RecordingStatus;
  duration: number; // seconds elapsed
  noteId: string | null;
  showPhoneCallWarning: boolean;
  showLowStorageWarning: boolean;
}
