# Fix 5 Partial Edge Cases

Fix these 5 edge cases in the existing codebase. Each one has UI/state partially done but is missing the actual detection logic.

## 1. Offline Record Warning (#3)

**File:** `src/features/recording/context/RecordingContext.tsx`

**Problem:** User can tap Record when offline. The app calls `api.notes.create()` which will fail, but there's no upfront warning.

**Fix:** Before calling the API in `startRecording()`, check `navigator.onLine`. If offline, show an `IonToast` or return a new result like `'offline'` so the caller can show an alert: "You're offline. Recording requires internet to initialize. Please check your connection."

Don't block recording entirely — just warn. If the user is offline, return `'offline'` from `startRecording()` and let `RecordingUI.tsx` / `HomePage` handle showing the alert (similar to how `'permission_denied'` and `'init_failed'` are handled).

## 2. Real Phone Call Detection (#7)

**File:** `src/features/recording/context/RecordingContext.tsx`

**Problem:** The phone call warning banner exists in `RecordingUI.tsx` and i18n strings exist, but nothing actually triggers `showPhoneCallWarning: true`. The current `visibilitychange` handler is empty.

**Fix:** Detect audio interruption by monitoring the `MediaStreamTrack` for the `mute` event. When a phone call comes in on iOS/Android, the OS mutes the mic track. Listen for this:

```typescript
// Inside startRecording(), after getting the stream:
const audioTrack = stream.getAudioTracks()[0];
audioTrack.addEventListener('mute', () => {
  // Phone call or other audio interruption
  if (mediaRecorderRef.current?.state === 'recording') {
    mediaRecorderRef.current.pause();
    stopTimer();
    setState(prev => ({
      ...prev,
      status: 'paused',
      showPhoneCallWarning: true,
    }));
  }
});
audioTrack.addEventListener('unmute', () => {
  // Call ended — don't auto-resume, just dismiss warning
  // User can manually resume
});
```

Store the track ref so listeners are cleaned up on stop/cancel.

## 3. Low Storage Detection (#9)

**File:** `src/features/recording/context/RecordingContext.tsx`

**Problem:** `showLowStorageWarning` state exists and `RecordingUI.tsx` has the warning banner, but nothing sets it to `true`.

**Fix:** Use the Storage Manager API to check available space. Add a check when recording starts and periodically during recording:

```typescript
async function checkLowStorage(): Promise<boolean> {
  if (!navigator.storage?.estimate) return false;
  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (!quota || !usage) return false;
    const remaining = quota - usage;
    // Warn if less than 50MB remaining
    return remaining < 50 * 1024 * 1024;
  } catch {
    return false;
  }
}
```

- Call `checkLowStorage()` at the start of recording. If low, set `showLowStorageWarning: true` (but still allow recording).
- Also check every 30 seconds during recording (add another interval alongside the timer).
- Clean up the interval on stop/cancel.

## 4. Pause Playback on App Background (#12)

**File:** `src/shared/components/AudioPlayer.tsx`

**Problem:** When user switches to another app while audio is playing, playback continues in the background. Should pause.

**Fix:** Add a `visibilitychange` listener that pauses audio when the page becomes hidden:

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden && isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [isPlaying]);
```

## 5. Pause Playback on Incoming Call (#13)

**File:** `src/shared/components/AudioPlayer.tsx`

**Problem:** When user receives a phone call during audio playback, audio keeps playing.

**Fix:** The `<audio>` element fires a `pause` event when the OS interrupts audio (e.g., incoming call on iOS/Android). Listen for it to sync state:

```typescript
// Inside the existing useEffect that sets up audio event listeners (the one with handleTimeUpdate, etc.):
const handlePause = () => {
  // Fired by OS audio interruption (incoming call) or user action
  setIsPlaying(false);
};
audio.addEventListener('pause', handlePause);
// ... and in cleanup:
audio.removeEventListener('pause', handlePause);
```

This ensures `isPlaying` state stays in sync even when the OS pauses audio externally.

---

## Testing

After making changes, run:
```bash
npm test
```

Make sure all existing tests still pass. The edge case tests in `src/__tests__/EdgeCases.test.tsx` should cover these scenarios — check if any tests need updating to match the new behavior.

## Files to modify:
1. `src/features/recording/context/RecordingContext.tsx` — #1, #2, #3
2. `src/shared/components/AudioPlayer.tsx` — #4, #5
3. `src/features/recording/types/index.ts` — if `startRecording` return type needs updating for `'offline'`
