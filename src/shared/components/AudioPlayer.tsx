import { useRef, useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { IonButton } from '@ionic/react';
import { Play, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '@/features/notes/services/notesService';
import { getUserToken } from '@/shared/lib/api/client';

interface AudioPlayerProps {
  audioUrl: string | undefined;
  duration: number;
  isCorrupted?: boolean;
}

export const AudioPlayer: FC<AudioPlayerProps> = ({ audioUrl, duration, isCorrupted }) => {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [hasError, setHasError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isDisabled = !audioUrl || isCorrupted || hasError || loading;

  // Fetch audio with auth header and create blob URL
  useEffect(() => {
    if (!audioUrl) return;
    let revoked = false;

    setLoading(true);
    setHasError(false);

    getUserToken().then((token) =>
    fetch(audioUrl, { headers: { 'anonymous-token': token } }))
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (revoked) return;
        setHasError(true);
        setLoading(false);
      });

    return () => {
      revoked = true;
    };
  }, [audioUrl]);

  // Revoke previous blob URL when a new one is created or on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  useEffect(() => {
    if (!blobUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
    };

    const handlePause = () => {
      // Fired by OS audio interruption (incoming call) or user action
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('pause', handlePause);

    // Check for corrupted audio (duration = 0 or NaN)
    if (isCorrupted || (audio.duration === 0 && audio.readyState > 0)) {
      setHasError(true);
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('pause', handlePause);
    };
  }, [blobUrl, isCorrupted]);

  // Pause playback when app goes to background
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

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || isDisabled) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch {
      setHasError(true);
    }
  }, [isPlaying, isDisabled]);

  const seekToPosition = useCallback((clientX: number) => {
    const audio = audioRef.current;
    const bar = progressBarRef.current;
    if (!audio || !bar || isDisabled || !audio.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  }, [isDisabled]);

  const handleBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    seekToPosition(e.clientX);
  }, [seekToPosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    seekToPosition(e.touches[0].clientX);
  }, [seekToPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    seekToPosition(e.touches[0].clientX);
  }, [seekToPosition]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  const progress = audioDuration > 0 ? currentTime / audioDuration : 0;

  if (!audioUrl) {
    return (
      <div
        className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm"
        data-testid="audio-error-missing"
      >
        <span>{t('detail.audioError')}</span>
      </div>
    );
  }

  if (isCorrupted || (hasError && audioDuration === 0)) {
    return (
      <div
        className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm"
        data-testid="audio-error-corrupted"
      >
        <span>{t('detail.audioCorrupted')}</span>
      </div>
    );
  }

  return (
    <div className="audio-player flex flex-col gap-2 p-4 bg-stone-100 dark:bg-gray-800 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm" data-testid="audio-player">
      {blobUrl && (
        <audio ref={audioRef} src={blobUrl} preload="metadata" data-testid="audio-element" />
      )}

      <div className="flex items-center gap-3">
        <IonButton
          fill="clear"
          onClick={togglePlay}
          disabled={isDisabled}
          aria-label={isPlaying ? t('detail.pause') : t('detail.play')}
          data-testid="audio-play-button"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </IonButton>

        <div
          ref={progressBarRef}
          className="flex-1 h-2 bg-stone-300 dark:bg-stone-600 rounded-full cursor-pointer relative select-none touch-none"
          onClick={handleBarClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          data-testid="audio-progress"
        >
          <div
            className="h-full bg-[var(--ion-color-primary)] rounded-full pointer-events-none"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border border-stone-300 dark:border-stone-500 pointer-events-none"
            style={{ left: `calc(${progress * 100}% - 8px)` }}
          />
        </div>

        <span className="text-xs text-text-secondary dark:text-neutral-400 font-mono min-w-[80px] text-right" data-testid="audio-time">
          {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(audioDuration))}
        </span>
      </div>

      {hasError && (
        <p className="text-red-500 text-xs" data-testid="audio-error-message">
          {t('detail.audioError')}
        </p>
      )}
    </div>
  );
};
