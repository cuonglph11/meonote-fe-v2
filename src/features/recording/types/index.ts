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
  audioLevel: number; // 0-1, current mic input level
  showPhoneCallWarning: boolean;
  showLowStorageWarning: boolean;
  showNoAudioWarning: boolean;
  interruptionDetected: boolean;
  isNative: boolean;
}
