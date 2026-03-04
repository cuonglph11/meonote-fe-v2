import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonBackButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonSpinner,
  IonAlert,
  useIonToast,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit3, RefreshCw, ChevronsUp, Mic } from 'lucide-react';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { useRecording } from '@/features/recording/hooks/useRecording';
import { AudioPlayer } from '@/shared/components/AudioPlayer';
import { RecordingUI } from '@/features/recording/components/RecordingUI';
import { api } from '@/shared/lib/api/client';
import type { Note } from '@/shared/types';

type Tab = 'summary' | 'transcription';

export const MeetingDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { notes, updateNote, removeNote } = useNotes();
  const { startRecording } = useRecording();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editSummaryValue, setEditSummaryValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [presentToast] = useIonToast();
  const contentRef = useRef<HTMLIonContentElement | null>(null);

  // Load note from cache first, then from API
  useEffect(() => {
    const cached = notes.find((n) => n.id === id);
    if (cached) {
      setNote(cached);
      setLoading(false);
    }

    // Fetch fresh data
    api.notes
      .get(id)
      .then((fresh) => {
        setNote(fresh);
        updateNote(id, fresh);
      })
      .catch(() => {
        if (!cached) setLoading(false);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleScroll = useCallback((e: CustomEvent) => {
    const target = e.detail as { scrollTop: number };
    setShowScrollTop(target.scrollTop > 300);
  }, []);

  const scrollToTop = useCallback(() => {
    contentRef.current?.scrollToTop(300);
  }, []);

  const handleSaveTitle = async () => {
    if (!note || !editTitleValue.trim()) {
      setIsEditingTitle(false);
      return;
    }
    const newTitle = editTitleValue.trim();
    setIsEditingTitle(false);
    setNote((prev) => (prev ? { ...prev, title: newTitle } : prev));
    updateNote(note.id, { title: newTitle });
    try {
      await api.notes.update(note.id, { title: newTitle });
    } catch {
      // Revert on error
      setNote((prev) => (prev ? { ...prev, title: note.title } : prev));
      updateNote(note.id, { title: note.title });
    }
  };

  const handleSaveSummary = async () => {
    if (!note) return;
    const newContent = editSummaryValue;
    setIsEditingSummary(false);
    setNote((prev) => (prev ? { ...prev, summarizedContent: newContent } : prev));
    updateNote(note.id, { summarizedContent: newContent });
    try {
      await api.notes.update(note.id, { summarizedContent: newContent });
    } catch {
      setNote((prev) =>
        prev ? { ...prev, summarizedContent: note.summarizedContent } : prev
      );
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    setShowDeleteConfirm(false);
    removeNote(note.id);
    try {
      await api.notes.delete(note.id);
    } catch {
      // Already removed locally
    }
    history.goBack();
  };

  const handleRetryUpload = async () => {
    if (!note) return;
    try {
      const updated = await api.notes.retry(note.id);
      setNote(updated);
      updateNote(note.id, updated);
      presentToast({ message: t('detail.retrySuccess'), duration: 3000 });
    } catch {
      presentToast({ message: t('error.serverError'), duration: 3000, color: 'danger' });
    }
  };

  const handleNewRecording = async () => {
    const result = await startRecording();
    if (result === 'permission_denied') {
      setShowPermissionAlert(true);
    }
  };

  if (loading && !note) {
    return (
      <IonPage data-testid="meeting-detail-page">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/home" />
            </IonButtons>
            <IonTitle>{t('common.loading')}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="flex items-center justify-center">
          <IonSpinner data-testid="detail-loading-spinner" />
        </IonContent>
      </IonPage>
    );
  }

  if (!note) {
    return (
      <IonPage data-testid="meeting-detail-page">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/home" />
            </IonButtons>
            <IonTitle>{t('common.error')}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>{t('error.unknownError')}</p>
        </IonContent>
      </IonPage>
    );
  }

  const isCorrupted = note.audioUrl !== undefined && note.duration === 0;
  const needsRetry = !note.summarizedContent && note.status !== 'pending';

  return (
    <IonPage data-testid="meeting-detail-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" data-testid="back-button" />
          </IonButtons>

          {/* Inline title editing */}
          {isEditingTitle ? (
            <input
              className="flex-1 bg-transparent text-lg font-medium px-2 outline-none border-b border-blue-500"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              autoFocus
              data-testid="title-edit-input"
            />
          ) : (
            <IonTitle
              onClick={() => {
                setIsEditingTitle(true);
                setEditTitleValue(note.title);
              }}
              data-testid="note-title"
            >
              {note.title}
            </IonTitle>
          )}

          <IonButtons slot="end">
            <IonButton
              onClick={() => {
                setIsEditingTitle(true);
                setEditTitleValue(note.title);
              }}
              aria-label={t('detail.editTitle')}
              data-testid="edit-title-button"
            >
              <Edit3 size={18} />
            </IonButton>
            <IonButton
              color="danger"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label={t('detail.deleteNote')}
              data-testid="delete-note-button"
            >
              <Trash2 size={18} />
            </IonButton>
            <IonButton
              onClick={handleNewRecording}
              aria-label={t('detail.newRecording')}
              data-testid="new-recording-button"
            >
              <Mic size={18} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent
        ref={contentRef}
        scrollEvents
        onIonScroll={handleScroll}
        className="ion-padding"
        data-testid="detail-content"
      >
        {/* Retry banner */}
        {needsRetry && (
          <div
            className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4 cursor-pointer"
            onClick={handleRetryUpload}
            data-testid="retry-banner"
          >
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              {t('detail.retryBanner')}
            </p>
            <RefreshCw
              size={18}
              className="text-yellow-600 dark:text-yellow-400 flex-shrink-0"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Audio player */}
        <div className="mb-6" data-testid="audio-player-section">
          <AudioPlayer
            audioUrl={note.audioUrl}
            duration={note.duration}
            isCorrupted={isCorrupted}
          />
        </div>

        {/* Tabs */}
        <IonSegment
          value={activeTab}
          onIonChange={(e) => setActiveTab(e.detail.value as Tab)}
          data-testid="detail-tabs"
        >
          <IonSegmentButton value="summary" data-testid="summary-tab">
            <IonLabel>{t('detail.summary')}</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="transcription" data-testid="transcription-tab">
            <IonLabel>{t('detail.transcription')}</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {/* Summary tab */}
        {activeTab === 'summary' && (
          <div className="mt-4" data-testid="summary-content">
            {isEditingSummary ? (
              <div>
                <textarea
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white resize-none outline-none border border-blue-500 min-h-[200px]"
                  value={editSummaryValue}
                  onChange={(e) => setEditSummaryValue(e.target.value)}
                  autoFocus
                  data-testid="summary-edit-textarea"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <IonButton fill="clear" onClick={() => setIsEditingSummary(false)}>
                    {t('common.cancel')}
                  </IonButton>
                  <IonButton onClick={handleSaveSummary}>{t('common.save')}</IonButton>
                </div>
              </div>
            ) : (
              <div>
                {note.summarizedContent ? (
                  <div
                    className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap"
                    data-testid="summary-text"
                  >
                    {note.summarizedContent}
                  </div>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 italic" data-testid="no-summary">
                    {t('detail.noSummary')}
                  </p>
                )}
                <IonButton
                  fill="clear"
                  size="small"
                  className="mt-2"
                  onClick={() => {
                    setIsEditingSummary(true);
                    setEditSummaryValue(note.summarizedContent || '');
                  }}
                  data-testid="edit-summary-button"
                >
                  <Edit3 size={14} className="mr-1" />
                  {t('detail.editSummary')}
                </IonButton>
              </div>
            )}
          </div>
        )}

        {/* Transcription tab */}
        {activeTab === 'transcription' && (
          <div className="mt-4" data-testid="transcription-content">
            {note.transcription ? (
              <div
                className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap"
                data-testid="transcription-text"
              >
                {note.transcription}
              </div>
            ) : (
              <p
                className="text-gray-400 dark:text-gray-500 italic"
                data-testid="no-transcription"
              >
                {t('detail.noTranscription')}
              </p>
            )}
          </div>
        )}

        {/* Spacer for scroll-to-top button */}
        <div className="h-20" />
      </IonContent>

      {/* Scroll to top button */}
      {showScrollTop && (
        <div className="fixed bottom-20 right-4 z-40">
          <IonButton
            shape="round"
            onClick={scrollToTop}
            aria-label={t('detail.scrollToTop')}
            data-testid="scroll-to-top-button"
          >
            <ChevronsUp size={20} />
          </IonButton>
        </div>
      )}

      {/* Delete confirm */}
      <IonAlert
        isOpen={showDeleteConfirm}
        header={t('detail.deleteConfirmTitle')}
        message={t('detail.deleteConfirmMessage')}
        buttons={[
          { text: t('common.cancel'), role: 'cancel', handler: () => setShowDeleteConfirm(false) },
          { text: t('common.delete'), role: 'destructive', handler: handleDelete },
        ]}
        onDidDismiss={() => setShowDeleteConfirm(false)}
        data-testid="delete-confirm-alert"
      />

      {/* Permission denied alert */}
      <IonAlert
        isOpen={showPermissionAlert}
        header={t('recording.permissionDenied')}
        message={t('recording.permissionDeniedMessage')}
        buttons={[
          { text: t('common.cancel'), role: 'cancel', handler: () => setShowPermissionAlert(false) },
          {
            text: t('recording.openSettings'),
            handler: () => setShowPermissionAlert(false),
          },
        ]}
        onDidDismiss={() => setShowPermissionAlert(false)}
        data-testid="detail-permission-denied-alert"
      />

      {/* Recording overlay */}
      <RecordingUI />
    </IonPage>
  );
};
