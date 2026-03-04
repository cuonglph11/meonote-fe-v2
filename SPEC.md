# MeoNote Frontend V2 — Specification

## Overview
MeoNote is a voice-note recording app. Users record audio meetings/notes, which get transcribed and summarized by AI. This is the **frontend** (React/Next.js PWA) that works on both web and mobile (via Capacitor/WebView).

## Tech Stack
- **Build:** Vite + @vitejs/plugin-react
- **UI Framework:** React 19 + Ionic React 8 (@ionic/react, @ionic/react-router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (@tailwindcss/vite)
- **Routing:** react-router-dom v5
- **State Management:** React Context + localStorage cache
- **i18n:** i18next + react-i18next (English + Vietnamese)
- **Icons:** lucide-react
- **Audio:** Web Audio API / MediaRecorder
- **Testing:** Jest

## Project Structure (follow this exactly)
```
src/
  main.tsx              — Entry point
  index.css             — Global styles (Tailwind imports)
  app/
    App.tsx             — Root component
    AppProviders.tsx    — Context providers wrapper
    router/
      index.tsx         — Route definitions
  pages/
    OnboardingPage/
    HomePage/
    MeetingDetailPage/
  features/
    settings/
      hooks/
      services/
      types/
    recording/
      hooks/
      services/
      types/
    notes/
      hooks/
      services/
      types/
  shared/
    lib/
      i18n/
        config.ts
        locales/en.json
        locales/vi.json
      api/
        client.ts
    components/
    hooks/
    types/
```

## Pages & Routes

### 1. `/onboarding` — First-time setup
- Language selection (EN/VI) with live preview
- Theme selection (Light/Dark/System)
- Consent checkbox (must accept to proceed)
- "Get Started" button → save prefs → navigate to `/home`
- Returning users skip onboarding (check localStorage flag)

### 2. `/home` — Note list (main page)
- Display all notes grouped by: Today, Yesterday, Older
- Each note card shows: title, date, duration, status (pending/ready/failed)
- Search bar: filter by title or summary content
- Pull-to-refresh to load latest notes
- Empty state with illustration + hint text
- Offline banner when network lost
- Record button (FAB) to start new recording
- Actions per note: rename, delete, share, retry upload
- Tap note → navigate to detail (if ready) or retry (if failed)
- Pending meeting card shown while uploading

### 3. `/meeting/:id` — Note detail
- Tabs: Summary | Transcription
- Audio player: play/pause, progress bar, time display
- Handle: corrupted audio (duration=0), missing audio file
- Edit title (inline)
- Edit summary content
- Delete note → navigate back to home
- Retry upload banner (when summarizedContent is empty)
- Scroll-to-top button
- Start new recording from detail page

### 4. Settings (Sheet Modal from home)
- Change language (EN/VI)
- Change theme (Light/Dark/System)
- View Terms of Service (iframe)
- View Privacy Policy (iframe)
- Show anonymous user token (truncated)
- Show app version
- Clear All Data → confirm dialog → reset everything → reload

## Recording Flow
1. Tap Record → check mic permission (show alert if denied with "Open Settings")
2. Init note via API → if fail, show error toast, don't start
3. Start MediaRecorder → show recording UI with timer
4. iOS: Start Live Activity notification
5. User can: Pause/Resume, Stop, Cancel
6. Stop: check duration >= 10s (alert if too short, don't stop)
7. On stop: show pending meeting → upload final audio
8. Upload success → add note to list
9. Upload fail → create local note → show retry banner
10. Cancel: delete note from server + remove pending meeting

## Recording Edge Cases
- Phone call → pause recording → show warning banner
- App backgrounded → continue recording in background
- Force kill → cleanup orphaned recording on next launch
- Network switch (WiFi↔4G) → continue normally
- Low storage → handle gracefully
- Screen wake lock on web platform during recording

## API Integration
- Base URL: configurable via env
- Auth: anonymous token (generated on first launch, stored in localStorage)
- Endpoints:
  - `POST /notes` — init note
  - `GET /notes` — list notes
  - `GET /notes/:id` — get note detail
  - `PATCH /notes/:id` — update title/content
  - `DELETE /notes/:id` — delete note
  - `POST /notes/:id/upload` — upload audio file
  - `POST /notes/:id/retry` — retry processing

## User Flow Diagrams

### App Launch
```
App Launch → Onboarding completed? 
  No → Onboarding (Language → Theme → Consent → Get Started) → Home
  Yes → Home → Load notes from localStorage cache → Fetch from API
```

### Recording
```
Tap Record → Mic permission? 
  Denied → Alert → Open Settings
  Granted → Init Note API → Start Recording → Show UI + Timer
  Stop → Duration >= 10s? → Upload → Success/Fail handling
  Pause → Resume/Stop
  Cancel → Delete from server → Return home
```

## Test Coverage Target
72 test cases total (see test-cases section in Notion):
- Onboarding: 6 cases
- Homepage: 17 cases  
- Record Detail: 18 cases
- Settings: 7 cases
- Edge Cases: 24 cases

## Complete Test Cases

### 1. Onboarding (6 cases)
| Feature | Test Case |
|---------|-----------|
| Language selection | Verify select language → UI updates immediately (live preview) |
| Theme selection | Verify select light/dark theme works |
| Consent | Verify uncheck consent → Get Started button disabled |
| Get Started | Verify click Get Started → save prefs → navigate to /home |
| Redirect | Verify first-time user → auto redirect to /onboarding |
| Redirect | Verify returning user → auto redirect to /home (skip onboarding) |

### 2. Homepage (17 cases)
| Feature | Test Case |
|---------|-----------|
| Delete record | Verify click delete record → remove record successful |
| Retry | Verify when load data errored → user can retry successful |
| Search | Verify search by title returns correct results |
| Search | Verify search by summary content returns correct results |
| Search | Verify search shows no results state when nothing found |
| Pull-to-refresh | Verify pull-to-refresh loads latest notes |
| Pull-to-refresh | Verify pull-to-refresh disabled during recording |
| Rename record | Verify inline rename title works |
| Rename record | Verify rename with empty title → cancel edit |
| Share | Verify share meeting (native share or copy link fallback) |
| Retry upload | Verify retry upload when upload failed → success |
| Empty state | Verify empty state shows correct image + hint when no notes |
| Offline | Verify offline banner shows when network lost |
| Grouping | Verify notes grouped correctly (Today, Yesterday, Older) |
| Pending state | Verify pending meeting displays while uploading |
| Navigation | Verify tap on note → navigate to detail page |
| Navigation | Verify tap on failed upload note → retry instead of navigate |

### 3. Record Detail (18 cases)
| Feature | Sub Feature | Test Case |
|---------|-------------|-----------|
| Audio Playback | Play | Verify play button loads audio and starts playback |
| Audio Playback | Pause | Verify pause button stops playback |
| Audio Playback | End | Verify play to end → resets to beginning |
| Audio Playback | Re-listen | Verify can re-listen recording from detail page |
| Audio Playback | Seek | ⚠️ NOT IMPLEMENTED: Seek/scrub audio (tua tới, tua lui) |
| Progress Bar | | Verify progress bar updates in real-time while playing |
| Audio Error | Corrupted | Verify error shown when audio file corrupted (duration=0) |
| Audio Error | Missing | Verify error shown when no audio file available |
| Summary | View | Verify summary tab displays correctly |
| Summary | Edit | Verify edit summarized content + save via API |
| Transcription | View | Verify transcription tab displays correctly |
| Tab Switch | | Verify switch between Summary ↔ Transcription tabs |
| Edit Title | | Verify inline edit title from detail page + save |
| Delete | | Verify delete note from detail → navigate back to home |
| Retry Upload | Banner | Verify retry banner shows when summarizedContent is empty |
| Retry Upload | Success | Verify retry upload success → updates meeting data |
| Scroll to Top | | Verify scroll-to-top button appears after scrolling down |
| New Recording | | Verify can start new recording from detail page |

### 4. Settings (7 cases)
| Feature | Test Case |
|---------|-----------|
| Terms/Privacy | Verify view terms of service / privacy policy opens correctly |
| Languages | Verify change language successful |
| Light/Dark mode | Verify change UI mode successful (light/dark/system) |
| User ID | Verify anonymous token displayed (truncated format) |
| Version | Verify app version displayed correctly |
| Clear All Data | Verify clear data → confirm → reset app (clear token, notes, prefs) → reload |
| Clear All Data | Verify cancel clear data → nothing happens |

### 5. Edge Cases (24 cases)
| Scenario | Test Case |
|----------|-----------|
| Delete while recording | Verify delete record while recording → cancel process successful |
| Record with internet | Verify start recording when internet available |
| Record without internet | Verify start recording when no internet |
| Lose internet during recording | Verify recording continues when internet lost mid-recording |
| Exit app while recording | Verify recording continues in background when app exits |
| Kill app while recording | Verify force kill app → cleanup orphaned recording on next launch |
| Incoming call during recording | Verify incoming call → recording paused → warning banner shown |
| Stop from notification | Verify stop recording from outside popup (Live Activity) |
| Low storage | Verify behavior when storage nearly full during recording |
| Power off during recording | Verify behavior when device powered off during recording |
| Switch WiFi ↔ 4G | Verify recording continues when switching WiFi to 4G and vice versa |
| Switch app during playback | Verify behavior when switching to another app during audio playback |
| Call during playback | Verify behavior when receiving call during audio playback |
| Recording < 10s | Verify stop recording under 10 seconds → alert too short, do not stop |
| Permission denied | Verify mic permission denied → alert with Open Settings option |
| Upload failed | Verify upload fail → create local note → show retry banner |
| Init note API fail | Verify init note API fail → show error toast, do not start recording |
| Force kill recovery | Verify app crash → relaunch → cleanup orphaned recording + delete server note |
| Wake lock (web) | Verify screen stays on during recording on web platform |
| Cancel during upload | Verify cancel recording while uploading → delete pending + delete server note |
| Resume after interrupt | Verify recording interrupted → resume → continue recording normally |
| Deep link from Live Activity | Verify tap Live Activity → opens app (does NOT auto-stop recording) |
| Corrupted audio | Verify corrupted audio file (duration=0) → show error, disable play |
| Pause/Resume recording | Verify user-initiated pause → resume recording works correctly |
