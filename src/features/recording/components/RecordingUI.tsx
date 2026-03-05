import { useState } from 'react';
import type { FC } from 'react';
import {
  IonButton,
  IonIcon,
  IonAlert,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Mic, Pause, PhoneCall, Play, Square, X } from 'lucide-react';
import { useRecording } from '../hooks/useRecording';
import { formatDuration } from '@/features/notes/services/notesService';

const VISUALIZER_WEIGHTS = [0.6, 0.8, 1.0, 0.9, 0.7, 1.0, 0.8, 0.5, 0.9, 0.7, 1.0, 0.6] as const;

export const RecordingUI: FC = () => {
  const { t } = useTranslation();
  const { state, stopRecording, pauseRecording, resumeRecording, cancelRecording } =
    useRecording();
  const [showTooShortAlert, setShowTooShortAlert] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (state.status === 'idle' || state.status === 'cancelled') return null;

  const handleStop = async () => {
    if (state.duration < 10) {
      setShowTooShortAlert(true);
      return;
    }
    await stopRecording();
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    setShowCancelConfirm(false);
    await cancelRecording();
  };

  const isUploading = state.status === 'uploading' || state.status === 'stopping';
  const isRecording = state.status === 'recording';
  const isPaused = state.status === 'paused';

  return (
    <>
      <div
        className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 backdrop-blur-sm z-50 flex items-end justify-center pb-safe"
        data-testid="recording-ui"
      >
        <div className="bg-warm-surface dark:bg-dark-surface rounded-t-[28px] w-full max-w-md p-6 pb-safe flex flex-col items-center gap-5 shadow-[0_-4px_30px_rgba(0,0,0,0.15)] animate-slide-up" style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}>

          {/* Handle bar */}
          <div className="w-10 h-1 rounded-full bg-stone-200 dark:bg-stone-700 -mt-1 mb-1" />

          {/* Recording indicator */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {/* Outer glow rings */}
              {isRecording && (
                <>
                  <div
                    className="absolute inset-0 rounded-full bg-terracotta/10 dark:bg-terracotta-light/10"
                    style={{
                      transform: `scale(${1.6 + state.audioLevel * 0.8})`,
                      opacity: 0.15 + state.audioLevel * 0.3,
                      transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
                    }}
                  />
                  <div
                    className="absolute inset-0 rounded-full border-2 border-terracotta/30 dark:border-terracotta-light/30 animate-recording-ring"
                    style={{
                      transform: `scale(${1.3 + state.audioLevel * 0.4})`,
                      transition: 'transform 0.15s ease-out',
                    }}
                  />
                </>
              )}

              {/* Main indicator circle */}
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center relative ${
                  isPaused
                    ? 'bg-gold/12 dark:bg-gold/8 border-2 border-gold/25 dark:border-gold/20'
                    : 'bg-gradient-to-br from-terracotta/15 to-terracotta-light/10 dark:from-terracotta-light/12 dark:to-terracotta/8 border-2 border-terracotta/20 dark:border-terracotta-light/15'
                }`}
              >
                <Mic
                  size={34}
                  strokeWidth={1.8}
                  className={isPaused ? 'text-gold' : 'text-terracotta dark:text-terracotta-light'}
                  aria-hidden="true"
                />

                {/* Live dot */}
                {isRecording && (
                  <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-terracotta dark:bg-terracotta-light shadow-sm shadow-terracotta/40">
                    <div className="w-full h-full rounded-full bg-terracotta dark:bg-terracotta-light animate-pulse-record" />
                  </div>
                )}
              </div>
            </div>

            {/* Audio level visualizer — multi-bar */}
            {(isRecording || isPaused) && (
              <div className="flex items-end gap-[3px] h-5" aria-label="Audio level indicator" role="meter" data-testid="audio-level-bar">
                {VISUALIZER_WEIGHTS.map((weight, i) => {
                  const level = isPaused ? 0.05 : Math.min(state.audioLevel * 3, 1) * weight;
                  return (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-gradient-to-t from-terracotta to-terracotta-light dark:from-terracotta-light dark:to-gold"
                      style={{
                        height: `${Math.max(3, level * 20)}px`,
                        opacity: isPaused ? 0.25 : 0.4 + level * 0.6,
                        transition: 'height 0.12s ease-out, opacity 0.12s ease-out',
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Status label */}
            <p className="text-xs font-heading font-medium tracking-wider uppercase text-warm-text-secondary dark:text-dark-text-secondary">
              {isUploading
                ? t('home.uploading')
                : isPaused
                ? t('recording.paused')
                : t('recording.recording')}
            </p>

            {/* Timer */}
            <p
              className="text-5xl font-heading font-bold text-warm-text dark:text-dark-text tabular-nums tracking-tight"
              data-testid="recording-timer"
            >
              {formatDuration(state.duration)}
            </p>
          </div>

          {/* No audio warning */}
          {state.showNoAudioWarning && (
            <div
              className="w-full bg-terracotta/8 dark:bg-terracotta-light/8 text-terracotta dark:text-terracotta-light text-sm rounded-xl p-3 border border-terracotta/15 dark:border-terracotta-light/15 flex items-center justify-center gap-2"
              data-testid="no-audio-warning"
            >
              <AlertTriangle size={16} className="flex-shrink-0" />
              {t('recording.noAudioDetected')}
            </div>
          )}

          {/* Phone call warning */}
          {state.showPhoneCallWarning && (
            <div
              className="w-full bg-gold/8 text-gold text-sm rounded-xl p-3 border border-gold/15 flex items-center justify-center gap-2"
              data-testid="phone-call-warning"
            >
              <PhoneCall size={16} className="flex-shrink-0" />
              {t('recording.phoneCallWarning')}
            </div>
          )}

          {/* Low storage warning */}
          {state.showLowStorageWarning && (
            <div
              className="w-full bg-gold/8 text-gold text-sm rounded-xl p-3 border border-gold/15 flex items-center justify-center gap-2"
              data-testid="low-storage-warning"
            >
              <AlertTriangle size={16} className="flex-shrink-0" />
              {t('recording.lowStorage')}
            </div>
          )}

          {/* Controls */}
          {!isUploading && (
            <div className="flex items-center justify-center gap-6 pt-1 pb-2">
              {/* Cancel — small, subtle */}
              <IonButton
                fill="clear"
                onClick={handleCancel}
                aria-label={t('recording.cancelRecording')}
                data-testid="cancel-recording-button"
                className="recording-control-btn"
              >
                <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-dark-surface-elevated flex items-center justify-center border border-stone-200 dark:border-stone-700/50 active:scale-95 transition-transform">
                  <X size={18} strokeWidth={2} className="text-warm-text-secondary dark:text-dark-text-secondary" />
                </div>
              </IonButton>

              {/* Stop — large, prominent, terracotta */}
              <IonButton
                fill="clear"
                onClick={handleStop}
                aria-label={t('recording.stopRecording')}
                data-testid="stop-recording-button"
                className="recording-control-btn"
              >
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-terracotta to-terracotta-light dark:from-terracotta-light dark:to-terracotta flex items-center justify-center shadow-lg shadow-terracotta/30 dark:shadow-terracotta-light/20 active:scale-95 transition-transform">
                  <Square size={22} fill="white" strokeWidth={0} className="text-white" />
                </div>
              </IonButton>

              {/* Pause / Resume — medium, outlined */}
              <IonButton
                fill="clear"
                onClick={isPaused ? resumeRecording : pauseRecording}
                aria-label={
                  isPaused
                    ? t('recording.resumeRecording')
                    : t('recording.pauseRecording')
                }
                data-testid="pause-resume-button"
                className="recording-control-btn"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 active:scale-95 transition-transform ${
                  isPaused
                    ? 'bg-gold/10 border-gold/40 dark:border-gold/30'
                    : 'bg-white dark:bg-dark-surface-elevated border-stone-200 dark:border-stone-600'
                }`}>
                  {isPaused ? (
                    <Play size={18} strokeWidth={2.5} className="text-gold ml-0.5" />
                  ) : (
                    <Pause size={18} strokeWidth={2.5} className="text-warm-text dark:text-dark-text" />
                  )}
                </div>
              </IonButton>
            </div>
          )}

          {/* Uploading state */}
          {isUploading && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-3 border-stone-200 dark:border-stone-700" />
                <div className="absolute inset-0 rounded-full border-3 border-terracotta dark:border-terracotta-light border-t-transparent animate-spin" />
              </div>
              <span className="text-sm font-medium text-warm-text-secondary dark:text-dark-text-secondary" data-testid="uploading-indicator">
                {t('home.uploading')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Too short alert */}
      <IonAlert
        isOpen={showTooShortAlert}
        header={t('recording.tooShort')}
        message={t('recording.tooShortMessage')}
        buttons={[{ text: t('common.ok'), handler: () => setShowTooShortAlert(false) }]}
        onDidDismiss={() => setShowTooShortAlert(false)}
        data-testid="too-short-alert"
      />

      {/* Cancel confirm */}
      <IonAlert
        isOpen={showCancelConfirm}
        header={t('recording.cancelRecording')}
        message={t('recording.cancelConfirm')}
        buttons={[
          { text: t('common.cancel'), role: 'cancel', handler: () => setShowCancelConfirm(false) },
          {
            text: t('recording.cancelRecording'),
            role: 'destructive',
            handler: confirmCancel,
          },
        ]}
        onDidDismiss={() => setShowCancelConfirm(false)}
        data-testid="cancel-confirm-alert"
      />
    </>
  );
};
