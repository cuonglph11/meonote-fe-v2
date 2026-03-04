import React, { useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonAlert,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { Mic, Pause, Play, Square, X } from 'lucide-react';
import { useRecording } from '../hooks/useRecording';
import { formatDuration } from '@/features/notes/services/notesService';

export const RecordingUI: React.FC = () => {
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

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center pb-safe"
        data-testid="recording-ui"
      >
        <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md p-6 flex flex-col items-center gap-6">
          {/* Status */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center relative ${
                state.status === 'paused'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              {/* Audio level ring */}
              {state.status === 'recording' && (
                <div
                  className="absolute inset-0 rounded-full border-4 border-red-400 dark:border-red-500"
                  style={{
                    transform: `scale(${1 + state.audioLevel * 0.5})`,
                    opacity: 0.3 + state.audioLevel * 0.7,
                    transition: 'transform 0.15s ease-out, opacity 0.15s ease-out',
                  }}
                />
              )}
              <Mic
                size={32}
                className={state.status === 'paused' ? 'text-yellow-500' : 'text-red-500'}
                aria-hidden="true"
              />
            </div>

            {/* Audio level bar */}
            {(state.status === 'recording' || state.status === 'paused') && (
              <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" data-testid="audio-level-bar">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{
                    width: `${Math.min(state.audioLevel * 100 * 3, 100)}%`,
                    transition: 'width 0.15s ease-out',
                  }}
                />
              </div>
            )}

            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {isUploading
                ? t('home.uploading')
                : state.status === 'paused'
                ? t('recording.paused')
                : t('recording.recording')}
            </p>

            <p
              className="text-4xl font-mono font-bold text-gray-900 dark:text-white"
              data-testid="recording-timer"
            >
              {formatDuration(state.duration)}
            </p>
          </div>

          {/* No audio warning */}
          {state.showNoAudioWarning && (
            <div
              className="w-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm rounded-lg p-3 text-center"
              data-testid="no-audio-warning"
            >
              {t('recording.noAudioDetected')}
            </div>
          )}

          {/* Phone call warning */}
          {state.showPhoneCallWarning && (
            <div
              className="w-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-sm rounded-lg p-3 text-center"
              data-testid="phone-call-warning"
            >
              {t('recording.phoneCallWarning')}
            </div>
          )}

          {/* Low storage warning */}
          {state.showLowStorageWarning && (
            <div
              className="w-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 text-sm rounded-lg p-3 text-center"
              data-testid="low-storage-warning"
            >
              {t('recording.lowStorage')}
            </div>
          )}

          {/* Controls */}
          {!isUploading && (
            <div className="flex items-center gap-8">
              {/* Cancel */}
              <IonButton
                fill="clear"
                color="danger"
                onClick={handleCancel}
                aria-label={t('recording.cancelRecording')}
                data-testid="cancel-recording-button"
              >
                <X size={24} />
              </IonButton>

              {/* Pause / Resume */}
              <IonButton
                fill="outline"
                onClick={state.status === 'paused' ? resumeRecording : pauseRecording}
                aria-label={
                  state.status === 'paused'
                    ? t('recording.resumeRecording')
                    : t('recording.pauseRecording')
                }
                data-testid="pause-resume-button"
              >
                {state.status === 'paused' ? <Play size={20} /> : <Pause size={20} />}
              </IonButton>

              {/* Stop */}
              <IonButton
                color="danger"
                onClick={handleStop}
                aria-label={t('recording.stopRecording')}
                data-testid="stop-recording-button"
              >
                <Square size={20} fill="currentColor" />
              </IonButton>
            </div>
          )}

          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span data-testid="uploading-indicator">{t('home.uploading')}</span>
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
