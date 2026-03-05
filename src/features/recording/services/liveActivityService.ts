import { LiveActivities } from 'capacitor-live-activities';
import type {
  LiveActivitiesOptions,
  DynamicIslandLayout,
} from 'capacitor-live-activities/dist/esm/definitions';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

import { isLiveActivitySupported } from '@/shared/lib/platform';

// Heartbeat constants
const LIVE_ACTIVITY_STALE_WINDOW_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 2_000;

// Persistence keys
const PREF_KEY_ACTIVITY_ID = 'liveActivity_activeActivityId';
const PREF_KEY_START_TIME = 'liveActivity_recordingStartTime';
const PREF_KEY_NOTE_ID = 'liveActivity_noteId';

// Design tokens
const RECORDING_RED = '#FF3B30';
const BACKGROUND_BRAND = '#1a1a1a';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#E0E0E0';
const WAVEFORM_ACTIVE = '#FF3B30';
const WAVEFORM_INACTIVE = '#7A82F7';

interface StartOptions {
  noteId?: string | null;
}

interface EndOptions {
  status: 'saved' | 'cancelled' | 'error';
  seconds?: number;
  message?: string;
}

let activeActivityId: string | null = null;
let recordingStartTime: number | null = null;
let lastStatusSent: string | null = null;
let cachedNoteId: string | null = null;
let updateInProgress = false;
let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;

const formatDuration = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return [hours, minutes, secs]
      .map((value, index) => (index === 0 ? value.toString() : value.toString().padStart(2, '0')))
      .join(':');
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Waveform bar for visualization
const createWaveformBar = (
  height: number,
  isActive = true
): LiveActivitiesOptions['layout'] => ({
  type: 'container',
  properties: [
    { width: 3 },
    { height },
    { backgroundColor: isActive ? WAVEFORM_ACTIVE : WAVEFORM_INACTIVE },
    { cornerRadius: 2 },
  ],
  children: [],
});

const createWaveformPattern = (
  heights: Array<{ height: number; isActive?: boolean }>,
  spacing = 3
): LiveActivitiesOptions['layout'] => ({
  type: 'container',
  properties: [
    { direction: 'horizontal' },
    { spacing },
  ],
  children: heights.map(({ height, isActive = true }) =>
    createWaveformBar(height, isActive)
  ),
});

// Timer component
const createTimer = (
  color: string,
  fontSize: number,
  fontWeight: 'bold' | 'semibold' | 'medium' = 'bold',
  maxWidth?: number
): LiveActivitiesOptions['layout'] => ({
  type: 'timer',
  properties: [
    { endTime: '{{startTime}}' } as any,
    { style: 'timer' } as any,
    ...(maxWidth !== undefined ? [{ color, maxWidth }] : [{ color }]),
    { fontSize },
    { fontWeight },
    { monospacedDigit: true },
    { alignment: 'trailing', paddingHorizontal: 4 },
  ],
});

// Lock screen layout
const baseLayout: LiveActivitiesOptions['layout'] = {
  type: 'container',
  properties: [
    { direction: 'horizontal' },
    { spacing: 16 },
    { padding: 16 },
    { height: 48 },
    { backgroundColor: BACKGROUND_BRAND },
    { cornerRadius: 24 },
  ],
  children: [
    {
      type: 'text',
      properties: [
        { text: '\u{1F431}' }, // cat emoji
        { color: 'white' },
        { fontSize: 16 },
      ],
    },
    {
      type: 'container',
      properties: [
        { direction: 'vertical' },
        { spacing: 4 },
      ],
      children: [
        {
          type: 'text',
          properties: [
            { text: 'Recording...' },
            { color: TEXT_SECONDARY },
            { fontWeight: 'medium' },
            { fontSize: 16 },
          ],
        },
      ],
    },
    createTimer('white', 32, 'bold'),
  ],
};

// Dynamic Island layout
const dynamicIslandLayout: DynamicIslandLayout = {
  expanded: {
    leading: { type: 'text', properties: [{ text: 'Left' }] },
    center: { type: 'text', properties: [{ text: 'Center' }] },
    trailing: { type: 'text', properties: [{ text: 'Right' }] },
    bottom: { type: 'text', properties: [{ text: '{{title}}' }] },
  },
  compactLeading: {
    type: 'text',
    properties: [
      { text: '\u{1F431}' }, // cat emoji
      { color: 'white' },
      { fontSize: 16 },
    ],
  },
  compactTrailing: createTimer('white', 16, 'medium', 44),
  minimal: {
    type: 'text',
    properties: [{ text: 'Hi!' }],
  },
};

// Paused lock screen layout
const createPausedLayout = (durationText: string): LiveActivitiesOptions['layout'] => ({
  type: 'container',
  properties: [
    { direction: 'horizontal' },
    { spacing: 16 },
    { padding: 16 },
    { height: 48 },
    { backgroundColor: BACKGROUND_BRAND },
    { cornerRadius: 24 },
  ],
  children: [
    {
      type: 'text',
      properties: [
        { text: '\u{1F431}' }, // cat emoji
        { color: 'white' },
        { fontSize: 16 },
      ],
    },
    {
      type: 'container',
      properties: [
        { direction: 'vertical' },
        { spacing: 4 },
      ],
      children: [
        {
          type: 'text',
          properties: [
            { text: 'Recording paused' },
            { color: '#FF9500' },
            { fontWeight: 'medium' },
            { fontSize: 16 },
          ],
        },
      ],
    },
    {
      type: 'text',
      properties: [
        { text: durationText },
        { color: 'white' },
        { fontSize: 32 },
        { fontWeight: 'bold' },
        { monospacedDigit: true },
      ],
    },
  ],
});

// Paused Dynamic Island layout
const createPausedDynamicIslandLayout = (durationText: string): DynamicIslandLayout => ({
  expanded: {
    leading: { type: 'text', properties: [{ text: 'Left' }] },
    center: { type: 'text', properties: [{ text: 'Center' }] },
    trailing: { type: 'text', properties: [{ text: 'Right' }] },
    bottom: { type: 'text', properties: [{ text: 'Paused' }] },
  },
  compactLeading: {
    type: 'text',
    properties: [
      { text: '\u{23F8}\u{FE0F}' }, // pause emoji
      { color: '#FF9500' },
      { fontSize: 16 },
    ],
  },
  compactTrailing: {
    type: 'text',
    properties: [
      { text: durationText },
      { color: 'white' },
      { fontSize: 16 },
      { fontWeight: 'medium' },
      { monospacedDigit: true },
    ],
  },
  minimal: {
    type: 'text',
    properties: [{ text: '\u{23F8}\u{FE0F}' }], // pause emoji
  },
});

const behavior: LiveActivitiesOptions['behavior'] = {
  widgetUrl: 'meonote://open',
  keyLineTint: RECORDING_RED,
  systemActionForegroundColor: TEXT_PRIMARY,
};

const buildDataPayload = (
  status: string,
  noteId?: string | null,
  message?: string
): Record<string, any> => ({
  startTime: recordingStartTime,
  status,
  noteId: noteId ?? cachedNoteId,
  message: message ?? '',
});

const ensureSupport = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    return await isLiveActivitySupported();
  } catch (error) {
    console.warn('[LiveActivity] Support check failed', error);
    return false;
  }
};

// Persistence helpers
const persistActivityState = async (
  activityId: string,
  startTime: number,
  noteId: string | null
): Promise<void> => {
  try {
    await Preferences.set({ key: PREF_KEY_ACTIVITY_ID, value: activityId });
    await Preferences.set({ key: PREF_KEY_START_TIME, value: String(startTime) });
    await Preferences.set({ key: PREF_KEY_NOTE_ID, value: noteId ?? '' });
  } catch (error) {
    console.warn('[LiveActivity] Failed to persist activity state', error);
  }
};

const clearPersistedActivityState = async (): Promise<void> => {
  try {
    await Preferences.remove({ key: PREF_KEY_ACTIVITY_ID });
    await Preferences.remove({ key: PREF_KEY_START_TIME });
    await Preferences.remove({ key: PREF_KEY_NOTE_ID });
  } catch (error) {
    console.warn('[LiveActivity] Failed to clear persisted state', error);
  }
};

const getPersistedActivityState = async (): Promise<{
  activityId: string | null;
  startTime: number | null;
  noteId: string | null;
}> => {
  try {
    const [idRes, timeRes, noteRes] = await Promise.all([
      Preferences.get({ key: PREF_KEY_ACTIVITY_ID }),
      Preferences.get({ key: PREF_KEY_START_TIME }),
      Preferences.get({ key: PREF_KEY_NOTE_ID }),
    ]);
    return {
      activityId: idRes.value || null,
      startTime: timeRes.value ? Number(timeRes.value) : null,
      noteId: noteRes.value || null,
    };
  } catch {
    return { activityId: null, startTime: null, noteId: null };
  }
};

// Heartbeat logic
const sendHeartbeat = async (): Promise<void> => {
  if (!activeActivityId || updateInProgress) return;

  updateInProgress = true;
  try {
    const newStaleDate = Date.now() + LIVE_ACTIVITY_STALE_WINDOW_MS;
    await LiveActivities.updateActivity({
      activityId: activeActivityId,
      data: buildDataPayload(lastStatusSent ?? 'Recording'),
      staleDate: newStaleDate,
    } as any);
  } catch (error) {
    console.warn('[LiveActivity] Heartbeat update failed', error);
  } finally {
    updateInProgress = false;
  }
};

const scheduleLiveActivityHeartbeat = (): void => {
  if (heartbeatIntervalId !== null) return;
  heartbeatIntervalId = setInterval(() => {
    void sendHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);
};

const clearLiveActivityHeartbeat = (): void => {
  if (heartbeatIntervalId !== null) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
};

// Reconciliation
export const reconcileLiveActivities = async (): Promise<void> => {
  const isSupported = await ensureSupport();
  if (!isSupported) return;

  try {
    const { activities } = await LiveActivities.getAllActivities();
    const persisted = await getPersistedActivityState();

    for (const activity of activities) {
      const nativeId = (activity as { id?: string }).id;
      if (!nativeId) continue;

      if (persisted.activityId && nativeId === persisted.activityId) continue;

      try {
        await LiveActivities.endActivity({
          activityId: nativeId,
          data: { status: 'Orphaned' },
          behavior: { dismissalPolicy: 'immediate' },
        } as any);
      } catch (err) {
        console.warn('[LiveActivity] Failed to end orphaned activity', nativeId, err);
      }
    }

    if (persisted.activityId) {
      const stillExists = activities.some((a: any) => a.id === persisted.activityId);
      if (!stillExists) {
        await clearPersistedActivityState();
      }
    }
  } catch (error) {
    console.warn('[LiveActivity] Reconciliation failed', error);
  }
};

export const startRecordingLiveActivity = async (
  options: StartOptions = {}
): Promise<string | null> => {
  const isSupported = await ensureSupport();
  if (!isSupported) return null;

  try {
    recordingStartTime = Date.now();
    const initialStaleDate = Date.now() + LIVE_ACTIVITY_STALE_WINDOW_MS;

    const { activityId } = await LiveActivities.startActivity({
      layout: baseLayout,
      dynamicIslandLayout,
      behavior,
      data: buildDataPayload('Recording', options.noteId),
      staleDate: initialStaleDate,
      relevanceScore: 100,
    });

    activeActivityId = activityId;
    cachedNoteId = options.noteId ?? null;
    lastStatusSent = 'Recording';

    await persistActivityState(activityId, recordingStartTime, cachedNoteId);
    scheduleLiveActivityHeartbeat();

    return activityId;
  } catch (error) {
    console.warn('[LiveActivity] Unable to start activity', error);
    return null;
  }
};

export const updateRecordingLiveActivity = async (
  seconds: number,
  status = 'Recording'
): Promise<void> => {
  if (!activeActivityId || !Capacitor.isNativePlatform()) return;
  if (lastStatusSent === status) return;
  if (updateInProgress) return;

  updateInProgress = true;
  try {
    await LiveActivities.updateActivity({
      activityId: activeActivityId,
      data: buildDataPayload(status),
    });
    lastStatusSent = status;
  } catch (error) {
    console.error('[LiveActivity] Failed to update activity', error);
  } finally {
    updateInProgress = false;
  }
};

export const pauseRecordingLiveActivity = async (
  durationSeconds: number
): Promise<void> => {
  if (!activeActivityId || !Capacitor.isNativePlatform()) return;

  clearLiveActivityHeartbeat();

  const durationText = formatDuration(durationSeconds);
  const activityIdToEnd = activeActivityId;

  try {
    await LiveActivities.endActivity({
      activityId: activityIdToEnd,
      data: { status: 'Paused' },
    });

    const { activityId } = await LiveActivities.startActivity({
      layout: createPausedLayout(durationText),
      dynamicIslandLayout: createPausedDynamicIslandLayout(durationText),
      behavior,
      data: { status: 'Paused', duration: durationText },
    });

    activeActivityId = activityId;
    lastStatusSent = 'Paused';
    await clearPersistedActivityState();
  } catch (error) {
    console.error('[LiveActivity] Failed to pause activity', error);
    // Keep activeActivityId if the old one wasn't ended yet
    if (activeActivityId === activityIdToEnd) {
      activeActivityId = null;
    }
  }
};

export const resumeRecordingLiveActivity = async (
  noteId?: string | null
): Promise<void> => {
  if (!activeActivityId || !Capacitor.isNativePlatform()) return;
  if (!recordingStartTime) return;

  const activityIdToEnd = activeActivityId;
  const preservedStartTime = recordingStartTime;
  const preservedNoteId = noteId ?? cachedNoteId;

  try {
    await LiveActivities.endActivity({
      activityId: activityIdToEnd,
      data: { status: 'Resuming' },
    });

    const { activityId } = await LiveActivities.startActivity({
      layout: baseLayout,
      dynamicIslandLayout,
      behavior,
      data: buildDataPayload('Recording', preservedNoteId),
      staleDate: Date.now() + LIVE_ACTIVITY_STALE_WINDOW_MS,
      relevanceScore: 100,
    });

    activeActivityId = activityId;
    recordingStartTime = preservedStartTime;
    cachedNoteId = preservedNoteId;
    lastStatusSent = 'Recording';

    await persistActivityState(activityId, recordingStartTime, cachedNoteId);
    scheduleLiveActivityHeartbeat();
  } catch (error) {
    console.error('[LiveActivity] Failed to resume activity', error);
    if (activeActivityId === activityIdToEnd) {
      activeActivityId = null;
    }
  }
};

export const endRecordingLiveActivity = async (
  options: EndOptions
): Promise<void> => {
  clearLiveActivityHeartbeat();

  if (!activeActivityId) return;

  const activityIdToEnd = activeActivityId;

  try {
    await LiveActivities.endActivity({
      activityId: activityIdToEnd,
      data: {
        startTime: recordingStartTime,
        status: 'Completed',
      },
      behavior: {
        dismissalPolicy: 'immediate',
      },
    } as any);
  } catch (error) {
    console.error('[LiveActivity] Failed to end activity:', error);
  } finally {
    activeActivityId = null;
    cachedNoteId = null;
    recordingStartTime = null;
    lastStatusSent = null;
    updateInProgress = false;
    await clearPersistedActivityState();
  }
};

export const cancelRecordingLiveActivity = async (): Promise<void> => {
  await endRecordingLiveActivity({ status: 'cancelled' });
};

export const hasActiveLiveActivity = (): boolean => activeActivityId !== null;
