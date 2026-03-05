import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import Keychain from '../../plugins/keychain';
import type { Note } from '../../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://meonote-api-v2.clen.dev/webhook';
if (import.meta.env.PROD && !BASE_URL.startsWith('https://')) {
  throw new Error('API base URL must use HTTPS in production');
}

const TOKEN_KEY = 'meonote_anonymous_token';

function syncToKeychain(token: string): void {
  Keychain.set({ key: TOKEN_KEY, value: token }).catch(() => {});
}

export async function getUserToken(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    // 1. Try Preferences (primary store)
    const { value: prefValue } = await Preferences.get({ key: TOKEN_KEY });
    if (prefValue) {
      syncToKeychain(prefValue);
      return prefValue;
    }

    // 2. Try Keychain (reinstall recovery)
    try {
      const { value: keychainValue } = await Keychain.get({ key: TOKEN_KEY });
      if (keychainValue) {
        await Preferences.set({ key: TOKEN_KEY, value: keychainValue });
        return keychainValue;
      }
    } catch {
      // Keychain unavailable, fall through to generate new token
    }

    // 3. Generate new token, write to both stores
    const token = crypto.randomUUID();
    await Preferences.set({ key: TOKEN_KEY, value: token });
    syncToKeychain(token);
    return token;
  }
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

// Legacy API returns _id, map to our Note type
interface LegacyNote {
  _id: string;
  title: string;
  duration: number;
  transcription?: string;
  summarizedContent?: string;
  createdAt: string;
  updatedAt: string;
  recordingMetadata?: {
    fileUuid?: string;
    duration_seconds?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function mapNote(raw: LegacyNote): Note {
  const hasContent = !!(raw.summarizedContent || raw.transcription);
  return {
    id: raw._id,
    title: raw.title,
    duration: raw.recordingMetadata?.duration_seconds ?? raw.duration ?? 0,
    status: hasContent ? 'ready' : 'pending',
    summarizedContent: raw.summarizedContent,
    transcription: raw.transcription,
    audioUrl: raw.recordingMetadata?.fileUuid
      ? `${BASE_URL}/file/download?fileUuid=${raw.recordingMetadata.fileUuid}`
      : undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1_000;

async function request<T>(path: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<T> {
  const token = await getUserToken();

  const headers: Record<string, string> = {
    'anonymous-token': token,
  };

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}: ${response.statusText}`);
    }

    // Handle empty responses
    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  } catch (err) {
    if (retries > 0 && !(err instanceof DOMException && err.name === 'AbortError' && options.method === 'DELETE')) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return request<T>(path, options, retries - 1);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  notes: {
    create: async (): Promise<Note> => {
      const raw = await request<Record<string, unknown>>('/note/init');
      const id = (raw._id || raw.note_id) as string;
      return {
        id,
        title: (raw.title as string) || `Recording ${new Date().toLocaleTimeString()}`,
        duration: 0,
        status: 'pending',
        createdAt: (raw.createdAt as string) || new Date().toISOString(),
        updatedAt: (raw.updatedAt as string) || new Date().toISOString(),
      };
    },

    list: async (): Promise<Note[]> => {
      const raw = await request<LegacyNote[] | null>('/notes');
      if (!Array.isArray(raw)) return [];
      return raw.map(mapNote);
    },

    get: async (id: string): Promise<Note> => {
      const raw = await request<LegacyNote>(`/note?id=${id}`);
      return mapNote(raw);
    },

    update: (
      id: string,
      data: Partial<Pick<Note, 'title' | 'summarizedContent'>>
    ): Promise<Note> =>
      request<LegacyNote>(`/note?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }).then(mapNote),

    delete: (id: string): Promise<void> =>
      request<void>(`/note?id=${id}`, { method: 'DELETE' }),

    upload: async (id: string, audio: Blob, type: 'partial' | 'final' = 'final'): Promise<Note> => {
      const token = await getUserToken();
      const formData = new FormData();

      // Detect extension from blob MIME type
      let extension = 'webm';
      if (audio.type === 'audio/mp4' || audio.type === 'audio/m4a') {
        extension = 'm4a';
      } else if (audio.type === 'audio/mpeg') {
        extension = 'mp3';
      }
      formData.append('file', audio, `recording_${Date.now()}.${extension}`);

      const response = await fetch(
        `${BASE_URL}/upload-v4?type=${type}&noteId=${id}`,
        {
          method: 'POST',
          headers: { 'anonymous-token': token },
          body: formData,
        }
      );

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      // After upload, fetch the updated note
      const raw = await request<LegacyNote>(`/note?id=${id}`);
      return mapNote(raw);
    },

    downloadAudio: async (fileUuid: string): Promise<Blob> => {
      const token = await getUserToken();
      const response = await fetch(
        `${BASE_URL}/file/download?fileUuid=${fileUuid}`,
        {
          headers: { 'anonymous-token': token },
        }
      );
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      return response.blob();
    },
  },
};
