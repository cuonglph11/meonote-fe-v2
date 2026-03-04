# MeoNote Frontend V2 — Specification

## Overview
MeoNote is a voice-note recording app. Users record audio meetings/notes, which get transcribed and summarized by AI. This is the **frontend** (React/Next.js PWA) that works on both web and mobile (via Capacitor/WebView).

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **State Management:** React Context + localStorage cache
- **i18n:** next-intl (English + Vietnamese)
- **Audio:** Web Audio API / MediaRecorder
- **PWA:** next-pwa
- **Testing:** Vitest + React Testing Library

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
