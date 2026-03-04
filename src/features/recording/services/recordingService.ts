const ORPHANED_RECORDING_KEY = 'meonote_orphaned_recording';

export const recordingService = {
  setOrphanedRecording(noteId: string): void {
    localStorage.setItem(ORPHANED_RECORDING_KEY, noteId);
  },

  getOrphanedRecording(): string | null {
    return localStorage.getItem(ORPHANED_RECORDING_KEY);
  },

  clearOrphanedRecording(): void {
    localStorage.removeItem(ORPHANED_RECORDING_KEY);
  },

  async checkMicPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.permissions) return 'prompt';
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state;
    } catch {
      return 'prompt';
    }
  },

  getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  },
};
