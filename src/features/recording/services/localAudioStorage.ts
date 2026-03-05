import { Filesystem, Directory } from '@capacitor/filesystem';
import { isNativePlatform } from '@/shared/lib/platform';

const AUDIO_DIRECTORY = 'recordings';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateNoteId(noteId: string): void {
  if (!UUID_REGEX.test(noteId)) {
    throw new Error('Invalid noteId format');
  }
}

async function ensureDirectoryExists(): Promise<void> {
  try {
    await Filesystem.mkdir({
      path: AUDIO_DIRECTORY,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('exists')) return;
    throw error;
  }
}

export const localAudioStorage = {
  async saveAudioBlob(noteId: string, blob: Blob): Promise<string> {
    validateNoteId(noteId);
    if (!isNativePlatform()) {
      console.log('[LocalAudioStorage] Skipping save on web platform');
      return '';
    }

    const base64Data = await blobToBase64(blob);
    return this.saveAudioFile(noteId, base64Data);
  },

  async saveAudioFile(noteId: string, base64Data: string): Promise<string> {
    validateNoteId(noteId);
    await ensureDirectoryExists();
    const filename = `${noteId}.m4a`;
    const path = `${AUDIO_DIRECTORY}/${filename}`;

    const result = await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Documents,
    });

    console.log(`[LocalAudioStorage] Saved: ${filename}`);
    return result.uri;
  },

  async hasAudioFile(noteId: string): Promise<boolean> {
    validateNoteId(noteId);
    if (!isNativePlatform()) return false;
    try {
      await Filesystem.stat({
        path: `${AUDIO_DIRECTORY}/${noteId}.m4a`,
        directory: Directory.Documents,
      });
      return true;
    } catch {
      return false;
    }
  },

  async getAudioFileUri(noteId: string): Promise<string | null> {
    validateNoteId(noteId);
    try {
      const result = await Filesystem.getUri({
        path: `${AUDIO_DIRECTORY}/${noteId}.m4a`,
        directory: Directory.Documents,
      });
      return result.uri;
    } catch {
      return null;
    }
  },

  async readAudioBlob(noteId: string): Promise<Blob | null> {
    validateNoteId(noteId);
    try {
      const result = await Filesystem.readFile({
        path: `${AUDIO_DIRECTORY}/${noteId}.m4a`,
        directory: Directory.Documents,
      });

      const base64Data = result.data as string;
      return base64ToBlob(base64Data, 'audio/mp4');
    } catch {
      return null;
    }
  },

  async readAudioBlobFromPath(path: string): Promise<Blob | null> {
    try {
      const result = await Filesystem.readFile({
        path,
        directory: Directory.Documents,
      });

      const base64Data = result.data as string;
      const mimeType = path.endsWith('.m4a') ? 'audio/mp4' : 'audio/wav';
      return base64ToBlob(base64Data, mimeType);
    } catch {
      return null;
    }
  },

  async deleteAudioFile(noteId: string): Promise<boolean> {
    validateNoteId(noteId);
    try {
      await Filesystem.deleteFile({
        path: `${AUDIO_DIRECTORY}/${noteId}.m4a`,
        directory: Directory.Documents,
      });
      return true;
    } catch {
      return false;
    }
  },

  async listAudioFiles(): Promise<string[]> {
    try {
      await ensureDirectoryExists();
      const result = await Filesystem.readdir({
        path: AUDIO_DIRECTORY,
        directory: Directory.Documents,
      });
      return result.files
        .filter((file) => file.name.endsWith('.m4a'))
        .map((file) => file.name.replace('.m4a', ''));
    } catch {
      return [];
    }
  },
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const bytes = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    bytes[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
