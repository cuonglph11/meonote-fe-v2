import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import type { FC } from 'react';
import {
  IonButton,
  IonAlert,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, Mic, Pause, PhoneCall, Play, Square, X } from 'lucide-react';
import { useRecording } from '../hooks/useRecording';
import { formatDuration } from '@/features/notes/services/notesService';

const VISUALIZER_WEIGHTS = [0.6, 0.8, 1.0, 0.9, 0.7, 1.0, 0.8, 0.5, 0.9, 0.7, 1.0, 0.6] as const;

const UPLOAD_MESSAGES = [
  'Saving recording\u2026',
  'Processing\u2026',
  'Almost there\u2026',
] as const;

export const RecordingUI: FC = () => {
  const { t } = useTranslation();
  const { state, stopRecording, pauseRecording, resumeRecording, cancelRecording } =
    useRecording();
  const [showTooShortAlert, setShowTooShortAlert] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(0);
  const prevStatusRef = useRef(state.status);

  const isUploading = state.status === 'uploading' || state.status === 'stopping';
  const isRecording = state.status === 'recording';
  const isPaused = state.status === 'paused';

  // Detect upload->idle transition for success animation
  useLayoutEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = state.status;
    if ((prev === 'uploading' || prev === 'stopping') && state.status === 'idle') {
      setShowSuccess(true);
    }
  }, [state.status]);

  // Auto-dismiss success
  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => setShowSuccess(false), 1500);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  // Progressive upload messages
  useEffect(() => {
    if (!isUploading) { setUploadPhase(0); return; }
    const t1 = setTimeout(() => setUploadPhase(1), 2500);
    const t2 = setTimeout(() => setUploadPhase(2), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isUploading]);

  if ((state.status === 'idle' || state.status === 'cancelled') && !showSuccess) return null;

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

  return (
    <>
      <div
        className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 backdrop-blur-sm z-50 flex items-end justify-center pb-safe"
        data-testid="recording-ui"
      >
        <div className="bg-warm-surface dark:bg-dark-surface rounded-t-[28px] w-full max-w-md p-6 pb-safe flex flex-col items-center gap-5 shadow-[0_-4px_30px_rgba(0,0,0,0.15)] animate-slide-up" style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}>

          {/* Handle bar */}
          <div className="w-10 h-1 rounded-full bg-stone-200 dark:bg-stone-700 -mt-1 mb-1" />

          {/* Main indicator section */}
          <div className="flex flex-col items-center gap-3">

            {showSuccess ? (
              /* ===== SUCCESS STATE ===== */
              <>
                <div className="relative">
                  {/* Expanding glow ring */}
                  <div
                    className="absolute inset-0 rounded-full bg-terracotta/10 dark:bg-terracotta-light/10"
                    style={{ animation: 'success-glow 0.8s ease-out forwards' }}
                  />
                  {/* Main circle */}
                  <div
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-terracotta/15 to-terracotta-light/10 dark:from-terracotta-light/12 dark:to-terracotta/8 border-2 border-terracotta/25 dark:border-terracotta-light/20 flex items-center justify-center"
                    style={{ animation: 'scale-in 0.3s ease-out both' }}
                  >
                    <Check
                      size={34}
                      strokeWidth={2.5}
                      className="text-terracotta dark:text-terracotta-light"
                      style={{ animation: 'check-pop 0.4s ease-out 0.15s both' }}
                    />
                  </div>
                </div>

                <p
                  className="text-xs font-heading font-semibold tracking-wider uppercase text-terracotta dark:text-terracotta-light"
                  style={{ animation: 'fade-in 0.3s ease-out 0.25s both' }}
                >
                  Recording saved!
                </p>
              </>

            ) : isUploading ? (
              /* ===== UPLOAD STATE ===== */
              <>
                <div className="relative w-20 h-20">
                  {/* Track ring */}
                  <div className="absolute inset-0 rounded-full border-[3px] border-stone-200/30 dark:border-stone-700/30" />
                  {/* Spinning ring */}
                  <div
                    className="absolute inset-0 rounded-full border-[3px] border-terracotta dark:border-terracotta-light animate-spin"
                    style={{
                      borderRightColor: 'transparent',
                      borderBottomColor: 'transparent',
                      animationDuration: '1.2s',
                      animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                  {/* Subtle inner pulse */}
                  <div
                    className="absolute inset-2 rounded-full bg-terracotta/5 dark:bg-terracotta-light/5 animate-pulse-record"
                  />
                  {/* Upload icon */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ animation: 'upload-float 2s ease-in-out infinite' }}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="text-terracotta dark:text-terracotta-light"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                </div>

                {/* Upload wave bars */}
                <div className="flex items-end gap-[3px] h-5" data-testid="uploading-indicator">
                  {VISUALIZER_WEIGHTS.map((_, i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-gradient-to-t from-terracotta/50 to-terracotta-light/50 dark:from-terracotta-light/50 dark:to-gold/50"
                      style={{
                        height: '14px',
                        animation: `upload-bar 1.4s ease-in-out ${i * 0.1}s infinite`,
                      }}
                    />
                  ))}
                </div>

                {/* Progressive text */}
                <p
                  key={uploadPhase}
                  className="text-xs font-heading font-medium tracking-wider uppercase text-warm-text-secondary dark:text-dark-text-secondary"
                  style={{ animation: 'fade-in 0.4s ease-out' }}
                >
                  {UPLOAD_MESSAGES[uploadPhase]}
                </p>

                {/* Dimmed timer */}
                <p
                  className="text-5xl font-heading font-bold text-warm-text/20 dark:text-dark-text/20 tabular-nums tracking-tight"
                  data-testid="recording-timer"
                >
                  {formatDuration(state.duration)}
                </p>
              </>

            ) : (
              /* ===== RECORDING STATE ===== */
              <>
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

                {/* Audio level visualizer */}
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
                  {isPaused
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
              </>
            )}
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
          {!isUploading && !showSuccess && (
            <div className="flex items-center justify-center gap-6 pt-1 pb-2">
              {/* Cancel */}
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

              {/* Stop */}
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

              {/* Pause / Resume */}
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
