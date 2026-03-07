import { useEffect, useState, useCallback, useRef } from 'react';
import type { FC } from 'react';
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
  IonSpinner,
  IonAlert,
  useIonToast,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit3, RefreshCw, ChevronsUp, Pencil, Sparkles } from 'lucide-react';
import { formatDuration } from '@/features/notes/services/notesService';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { useRecording } from '@/features/recording/hooks/useRecording';
import { AudioPlayer } from '@/shared/components/AudioPlayer';
import { RecordingUI } from '@/features/recording/components/RecordingUI';
import { MarkdownContent } from '@/shared/components/MarkdownContent';
import { api } from '@/shared/lib/api/client';
import { RegenerateSheet } from '@/features/notes/components/RegenerateSheet';
import type { Note } from '@/shared/types';

const MAX_SUMMARY_LENGTH = 50_000;

type Tab = 'summary' | 'transcription';

export const MeetingDetailPage: FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { notes, updateNote, removeNote } = useNotes();
  const { startRecording } = useRecording();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editSummaryValue, setEditSummaryValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
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

  const getDisplayTitle = (n: Note) => {
    if (!n.summarizedContent) return n.title;
    const firstLine = n.summarizedContent.split('\n')[0].replace(/^#+\s*/, '').trim();
    return firstLine || n.title;
  };

  const handleSaveSummary = async () => {
    if (!note) return;
    const newContent = editSummaryValue.slice(0, MAX_SUMMARY_LENGTH);
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
      // Re-fetch note from API to check if processing completed
      const updated = await api.notes.get(note.id);
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

  const handleRegenerated = useCallback(
    (newContent: string) => {
      setIsRegenerating(false);
      if (!newContent) {
        presentToast({ message: t('regenerate.failed'), duration: 3000, color: 'danger' });
        return;
      }
      setNote((prev) => (prev ? { ...prev, summarizedContent: newContent } : prev));
      if (note) updateNote(note.id, { summarizedContent: newContent });
      setActiveTab('summary');
      contentRef.current?.scrollToTop(300);
    },
    [note, updateNote, presentToast, t],
  );

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

          <IonTitle data-testid="note-title" className="line-clamp-1">
            {getDisplayTitle(note)}
          </IonTitle>

          <IonButtons slot="end">
            <IonButton
              color="danger"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label={t('detail.deleteNote')}
              data-testid="delete-note-button"
            >
              <Trash2 size={18} />
            </IonButton>
            {note.summarizedContent && (
              <IonButton
                onClick={() => setIsRegenerateOpen(true)}
                disabled={isRegenerating}
                aria-label={t('regenerate.button')}
                data-testid="regenerate-button"
              >
                <Sparkles size={18} />
              </IonButton>
            )}
            <IonButton
              onClick={() => {
                setActiveTab('summary');
                setIsEditingSummary(true);
                setEditSummaryValue(note.summarizedContent || '');
              }}
              aria-label={t('detail.editSummary')}
              data-testid="edit-summary-header-button"
            >
              <Pencil size={18} />
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
            className="flex items-center justify-between bg-warning/10 dark:bg-warning/5 border border-warning/30 dark:border-warning/20 rounded-xl p-3 mb-4 cursor-pointer"
            onClick={handleRetryUpload}
            data-testid="retry-banner"
          >
            <p className="text-warning dark:text-warning text-sm font-medium">
              {t('detail.retryBanner')}
            </p>
            <RefreshCw
              size={18}
              className="text-warning flex-shrink-0"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Note metadata */}
        <div className="flex items-center gap-2 mb-3 text-[11px] text-text-secondary dark:text-neutral-400">
          <span>
            {new Date(note.createdAt).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="w-[3px] h-[3px] rounded-full bg-text-secondary/30 dark:bg-neutral-400/30" />
          <span className="font-mono">{formatDuration(note.duration)}</span>
        </div>

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
          <div className="mt-4 animate-fade-in" data-testid="summary-content">
            {isEditingSummary ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100 dark:border-stone-700/50 bg-stone-50/50 dark:bg-gray-800/50">
                  <span className="text-xs font-sans font-medium text-text-secondary dark:text-neutral-400 uppercase tracking-wider">Markdown</span>
                  <div className="flex gap-1">
                    <IonButton fill="clear" size="small" onClick={() => setIsEditingSummary(false)}>
                      {t('common.cancel')}
                    </IonButton>
                    <IonButton size="small" onClick={handleSaveSummary}>{t('common.save')}</IonButton>
                  </div>
                </div>
                <textarea
                  className="w-full p-4 bg-transparent text-text-primary dark:text-gray-100 resize-y outline-none font-mono text-sm leading-relaxed min-h-[40vh] md:min-h-[60vh] max-h-[80vh]"
                  value={editSummaryValue}
                  onChange={(e) => setEditSummaryValue(e.target.value)}
                  autoFocus
                  data-testid="summary-edit-textarea"
                />
              </div>
            ) : isRegenerating ? (
              <div className="space-y-3 py-2" data-testid="regenerate-skeleton">
                <div className="h-4 w-full rounded bg-stone-200 dark:bg-stone-700 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-stone-200 dark:bg-stone-700 animate-pulse" />
                <div className="h-4 w-4/6 rounded bg-stone-200 dark:bg-stone-700 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-stone-200 dark:bg-stone-700 animate-pulse" />
                <p className="text-xs text-text-secondary dark:text-neutral-400 mt-4">
                  {t('regenerate.regenerating')}
                </p>
              </div>
            ) : (
              <div>
                {note.summarizedContent ? (
                  <MarkdownContent
                    content={note.summarizedContent}
                    data-testid="summary-text"
                  />
                ) : (
                  <p className="text-text-secondary dark:text-neutral-400 italic" data-testid="no-summary">
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
          <div className="mt-4 animate-fade-in" data-testid="transcription-content">
            {note.transcription ? (
              <MarkdownContent
                content={note.transcription}
                data-testid="transcription-text"
              />
            ) : (
              <p
                className="text-text-secondary dark:text-neutral-400 italic"
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
        <div className="fixed bottom-20 right-4 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] z-40">
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

      {/* Regenerate sheet */}
      <RegenerateSheet
        isOpen={isRegenerateOpen}
        onDismiss={() => setIsRegenerateOpen(false)}
        noteId={note.id}
        onRegenerated={handleRegenerated}
        isRegenerating={isRegenerating}
        onRegenerateStart={() => setIsRegenerating(true)}
      />

      {/* Recording overlay */}
      <RecordingUI />
    </IonPage>
  );
};
