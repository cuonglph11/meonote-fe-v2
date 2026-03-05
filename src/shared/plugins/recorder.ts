import { registerPlugin } from '@capacitor/core';

export interface RecorderPlugin {
  requestPermission(): Promise<{ value: boolean }>;
  hasAudioRecordingPermission(): Promise<{ value: boolean }>;
  requestAudioRecordingPermission(): Promise<{ value: boolean }>;
  startRecording(options?: {
    directory?: string;
    subDirectory?: string;
    filename?: string;
  }): Promise<{ value: { started: boolean } }>;
  stopRecording(): Promise<{
    value: {
      path?: string;
      mimeType: string;
      msDuration: number;
    };
  }>;
  pauseRecording(): Promise<{ paused: boolean }>;
  resumeRecording(): Promise<{ recording: boolean }>;
  getCurrentStatus(): Promise<{ status: 'RECORDING' | 'PAUSED' | 'NONE' }>;
  getLastRecording(): Promise<{ filePath?: string; exists: boolean }>;
  cleanupOrphanedRecording(): Promise<{ hadOrphan: boolean; deletedPath?: string }>;
}

const Recorder = registerPlugin<RecorderPlugin>('Recorder');

export default Recorder;
