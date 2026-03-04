import type { Note } from '../../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const TOKEN_KEY = 'meonote_user_token';

export function getUserToken(): string {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getUserToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  notes: {
    create: (): Promise<Note> =>
      request<Note>('/notes', { method: 'POST', body: JSON.stringify({}) }),

    list: (): Promise<Note[]> => request<Note[]>('/notes'),

    get: (id: string): Promise<Note> => request<Note>(`/notes/${id}`),

    update: (
      id: string,
      data: Partial<Pick<Note, 'title' | 'summarizedContent'>>
    ): Promise<Note> =>
      request<Note>(`/notes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string): Promise<void> =>
      request<void>(`/notes/${id}`, { method: 'DELETE' }),

    upload: (id: string, audio: Blob): Promise<Note> => {
      const token = getUserToken();
      const formData = new FormData();
      formData.append('audio', audio, 'recording.webm');
      return fetch(`${BASE_URL}/notes/${id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).then((r) => {
        if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
        return r.json() as Promise<Note>;
      });
    },

    retry: (id: string): Promise<Note> =>
      request<Note>(`/notes/${id}/retry`, { method: 'POST' }),
  },
};
