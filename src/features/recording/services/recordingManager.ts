import Recorder from '@/shared/plugins/recorder';

export type NativeRecordingState = 'idle' | 'recording' | 'paused';
export type InterruptionType = 'none' | 'maybeMicTaken';

export interface RecordingResult {
  data: {
    path?: string;
    mimeType: string;
    msDuration: number;
  } | null;
  interruption: InterruptionType;
  expectedDurationMs: number;
  actualDurationMs: number;
  gap: number;
}

class RecordingManager {
  private state: NativeRecordingState = 'idle';
  private startTime: number | null = null;
  private pauseStartTime: number | null = null;
  private totalPausedMs = 0;
  private appWasBackgrounded = false;

  private readonly INTERRUPTION_GAP_THRESHOLD_MS = 5000;

  getState(): NativeRecordingState {
    return this.state;
  }

  isPaused(): boolean {
    return this.state === 'paused';
  }

  getStartTime(): number | null {
    return this.startTime;
  }

  /** Sync JS state when native side has already paused the recorder (e.g. interruption). */
  syncPaused(): void {
    if (this.state === 'recording') {
      this.state = 'paused';
      this.pauseStartTime = Date.now();
      console.log('[RecordingManager] Synced to paused (native interruption)');
    }
  }

  setAppBackgrounded(value: boolean): void {
    if (this.state === 'recording') {
      this.appWasBackgrounded = value;
      console.log(`[RecordingManager] App backgrounded flag set to: ${value}`);
    }
  }

  async checkForInterruption(): Promise<{ hasInterruption: boolean; gap: number }> {
    if (this.state !== 'recording' && this.state !== 'paused') {
      return { hasInterruption: false, gap: 0 };
    }

    try {
      const status = await Recorder.getCurrentStatus();
      const hasInterruption = status.status === 'PAUSED' && this.state === 'recording';

      if (hasInterruption) {
        this.state = 'paused';
        this.pauseStartTime = Date.now();
        console.log('[RecordingManager] Interruption detected via getCurrentStatus');
      }

      return { hasInterruption, gap: 0 };
    } catch (error) {
      console.error('[RecordingManager] Error checking interruption:', error);
      return { hasInterruption: false, gap: 0 };
    }
  }

  async checkPermissions(): Promise<boolean> {
    const result = await Recorder.hasAudioRecordingPermission();
    return result.value;
  }

  async requestPermissions(): Promise<boolean> {
    const result = await Recorder.requestAudioRecordingPermission();
    return result.value;
  }

  async start(noteId: string): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('Recording already in progress');
    }

    console.log('[RecordingManager] Starting recording for noteId:', noteId);

    await Recorder.startRecording({
      directory: 'DATA',
      subDirectory: 'recordings',
      filename: `${noteId}.m4a`,
    });

    this.state = 'recording';
    this.startTime = Date.now();
    this.totalPausedMs = 0;
    this.pauseStartTime = null;
    this.appWasBackgrounded = false;

    console.log('[RecordingManager] Recording started');
  }

  async stop(): Promise<RecordingResult> {
    if (this.state === 'idle') {
      throw new Error('No recording in progress');
    }

    // Account for any ongoing pause
    if (this.state === 'paused' && this.pauseStartTime) {
      this.totalPausedMs += Date.now() - this.pauseStartTime;
      this.pauseStartTime = null;
    }

    console.log('[RecordingManager] Stopping recording');
    const result = await Recorder.stopRecording();

    const wallClockMs = this.startTime ? Date.now() - this.startTime : 0;
    const expectedDurationMs = wallClockMs - this.totalPausedMs;
    const actualDurationMs = result.value?.msDuration || 0;
    const gap = Math.max(0, expectedDurationMs - actualDurationMs);

    console.log('[RecordingManager] Recording stopped');
    console.log('  Expected duration:', expectedDurationMs, 'ms');
    console.log('  Actual duration:', actualDurationMs, 'ms');
    console.log('  Gap:', gap, 'ms');

    let interruption: InterruptionType = 'none';
    if (gap > this.INTERRUPTION_GAP_THRESHOLD_MS) {
      interruption = 'maybeMicTaken';
      console.log('[RecordingManager] Interruption detected: gap indicates mic was taken');
    }

    this.state = 'idle';
    this.startTime = null;
    this.pauseStartTime = null;
    this.totalPausedMs = 0;
    this.appWasBackgrounded = false;

    return {
      data: result.value
        ? {
            path: result.value.path,
            mimeType: result.value.mimeType,
            msDuration: result.value.msDuration,
          }
        : null,
      interruption,
      expectedDurationMs,
      actualDurationMs,
      gap,
    };
  }

  async pause(): Promise<void> {
    if (this.state === 'paused') {
      console.log('[RecordingManager] Already paused');
      return;
    }
    if (this.state !== 'recording') return;

    try {
      await Recorder.pauseRecording();
      this.state = 'paused';
      this.pauseStartTime = Date.now();
      console.log('[RecordingManager] Recording paused');
    } catch (error) {
      const status = await Recorder.getCurrentStatus();
      if (status.status === 'PAUSED') {
        this.state = 'paused';
        this.pauseStartTime = Date.now();
        console.log('[RecordingManager] Recording already paused, state synced');
      } else {
        throw error;
      }
    }
  }

  async resume(): Promise<void> {
    if (this.state !== 'paused') return;
    await Recorder.resumeRecording();
    if (this.pauseStartTime) {
      this.totalPausedMs += Date.now() - this.pauseStartTime;
      this.pauseStartTime = null;
    }
    this.state = 'recording';
    console.log('[RecordingManager] Recording resumed');
  }

  async cleanupOrphaned(): Promise<void> {
    try {
      const result = await Recorder.cleanupOrphanedRecording();
      if (result.hadOrphan) {
        console.log('[RecordingManager] Cleaned up orphaned recording:', result.deletedPath);
      }
    } catch (error) {
      console.error('[RecordingManager] Error cleaning up orphaned recording:', error);
    }
  }

  reset(): void {
    this.state = 'idle';
    this.startTime = null;
    this.pauseStartTime = null;
    this.totalPausedMs = 0;
    this.appWasBackgrounded = false;
    console.log('[RecordingManager] Reset');
  }
}

export const recordingManager = new RecordingManager();
