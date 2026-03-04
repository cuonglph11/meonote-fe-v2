import { useEffect, useState, useCallback } from 'react';
import type { FC } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonSearchbar,
  IonRefresher,
  IonRefresherContent,
  IonFab,
  IonFabButton,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonBadge,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonAlert,
  useIonToast,
  useIonAlert,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings, Share2, RefreshCw, Trash2, Edit3, Mic } from 'lucide-react';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { useRecording } from '@/features/recording/hooks/useRecording';
import { useSettings } from '@/features/settings/hooks/useSettings';
import { OfflineBanner } from '@/shared/components/OfflineBanner';
import { RecordingUI } from '@/features/recording/components/RecordingUI';
import { SettingsModal } from '@/features/settings/components/SettingsModal';
import { groupNotesByDate, filterNotes, formatDuration } from '@/features/notes/services/notesService';
import { api } from '@/shared/lib/api/client';
import type { Note } from '@/shared/types';

export const HomePage: FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { notes, pendingNotes, loading, error, fetchNotes, removeNote, updateNote, retryNoteLoad } =
    useNotes();
  const { startRecording, isActive } = useRecording();
  const { settings } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [showInitFailAlert, setShowInitFailAlert] = useState(false);
  const [presentToast] = useIonToast();

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleRefresh = async (event: CustomEvent) => {
    if (isActive) {
      event.detail.complete();
      return;
    }
    await fetchNotes();
    event.detail.complete();
  };

  const handleRecord = async () => {
    const result = await startRecording();
    if (result === 'permission_denied') {
      setShowPermissionAlert(true);
    } else if (result === 'init_failed') {
      setShowInitFailAlert(true);
    }
  };

  const handleNoteClick = (note: Note) => {
    if (note.status === 'failed') {
      handleRetryUpload(note.id);
      return;
    }
    history.push(`/meeting/${note.id}`);
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    removeNote(id);
    try {
      await api.notes.delete(id);
    } catch {
      // Silently fail — already removed from local state
    }
  };

  const handleRename = (note: Note) => {
    setRenameTargetId(note.id);
    setRenameValue(note.title);
  };

  const confirmRename = async () => {
    if (!renameTargetId || !renameValue.trim()) {
      setRenameTargetId(null);
      return;
    }
    const id = renameTargetId;
    const newTitle = renameValue.trim();
    setRenameTargetId(null);
    updateNote(id, { title: newTitle });
    try {
      await api.notes.update(id, { title: newTitle });
    } catch {
      // Already updated in local state
    }
  };

  const handleShare = async (note: Note) => {
    const text = `${note.title}\n${note.summarizedContent || ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: note.title, text });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(text);
      presentToast({ message: t('common.success'), duration: 2000 });
    }
  };

  const handleRetryUpload = async (id: string) => {
    try {
      // Re-fetch note from API to check if processing completed
      const fresh = await api.notes.get(id);
      updateNote(id, fresh);
      presentToast({ message: t('detail.retrySuccess'), duration: 3000 });
    } catch {
      presentToast({ message: t('error.serverError'), duration: 3000, color: 'danger' });
    }
  };

  const filteredNotes = filterNotes(notes, searchQuery);
  const grouped = groupNotesByDate(filteredNotes);
  const hasNotes = notes.length > 0;
  const hasFilteredNotes = filteredNotes.length > 0;

  const renderStatusBadge = (note: Note) => {
    switch (note.status) {
      case 'pending':
        return (
          <IonBadge color="warning" data-testid={`status-pending-${note.id}`}>
            {t('home.pending')}
          </IonBadge>
        );
      case 'failed':
        return (
          <IonBadge color="danger" data-testid={`status-failed-${note.id}`}>
            {t('home.failed')}
          </IonBadge>
        );
      case 'ready':
      default:
        return null;
    }
  };

  const getDisplayTitle = (note: Note) => {
    if (!note.summarizedContent) return note.title;
    const firstLine = note.summarizedContent.split('\n')[0].replace(/^#+\s*/, '').trim();
    return firstLine || note.title;
  };

  const getPreviewSnippet = (note: Note) => {
    if (!note.summarizedContent) return null;
    const lines = note.summarizedContent.split('\n');
    const rest = lines.slice(1).join(' ').replace(/^#+\s*/gm, '').trim();
    return rest || null;
  };

  const renderNoteItem = (note: Note) => {
    const statusColor = note.status === 'failed' ? 'bg-red-500' : note.status === 'pending' ? 'bg-gold' : 'bg-terracotta/30 dark:bg-terracotta-light/30';

    return (
      <IonItemSliding key={note.id} data-testid={`note-item-${note.id}`}>
        <IonItem
          button
          onClick={() => handleNoteClick(note)}
          detail={note.status === 'ready'}
          className="note-item"
        >
          <div className={`w-[3px] self-stretch rounded-full mr-3.5 flex-shrink-0 ${statusColor}`} />
          <IonLabel>
            <h2 className="font-heading font-medium text-[0.9375rem] leading-snug text-warm-text dark:text-dark-text">{getDisplayTitle(note)}</h2>
            <p style={{ fontSize: '12px', color: '#78716C', marginTop: '2px' }}>
              {new Date(note.createdAt).toLocaleTimeString(settings.language === 'vi' ? 'vi-VN' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' \u00B7 '}
              {formatDuration(note.duration)}
            </p>
          </IonLabel>
          {renderStatusBadge(note)}
        </IonItem>

        <IonItemOptions side="end">
          <IonItemOption
            color="primary"
            onClick={() => handleRename(note)}
            data-testid={`rename-button-${note.id}`}
          >
            <Edit3 size={18} />
          </IonItemOption>
          <IonItemOption
            onClick={() => handleShare(note)}
            data-testid={`share-button-${note.id}`}
          >
            <Share2 size={18} />
          </IonItemOption>
          {note.status === 'failed' && (
            <IonItemOption
              color="warning"
              onClick={() => handleRetryUpload(note.id)}
              data-testid={`retry-upload-button-${note.id}`}
            >
              <RefreshCw size={18} />
            </IonItemOption>
          )}
          <IonItemOption
            color="danger"
            onClick={() => handleDelete(note.id)}
            data-testid={`delete-button-${note.id}`}
          >
            <Trash2 size={18} />
          </IonItemOption>
        </IonItemOptions>
      </IonItemSliding>
    );
  };

  const renderSection = (title: string, sectionNotes: Note[]) => {
    if (sectionNotes.length === 0) return null;
    return (
      <div key={title} data-testid={`section-${title.toLowerCase()}`}>
        <div className="sticky top-0 z-10 px-4 py-2 bg-warm-ivory/95 dark:bg-dark-bg/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-terracotta dark:bg-terracotta-light opacity-70" />
            <p className="text-[11px] font-heading font-semibold uppercase tracking-widest" style={{ color: 'var(--ion-text-color)', opacity: 0.5 }}>
              {title}
            </p>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-dark-surface-elevated" style={{ color: 'var(--ion-text-color)', opacity: 0.4 }}>
              {sectionNotes.length}
            </span>
          </div>
        </div>
        <IonList>{sectionNotes.map(renderNoteItem)}</IonList>
      </div>
    );
  };

  return (
    <IonPage data-testid="home-page">
      <IonHeader className="home-header">
        <IonToolbar className="home-toolbar">
          <div className="flex items-center justify-between px-4 py-2">
            {/* Left: Logo + Title + Date */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex-shrink-0">
                <img src="/logo_meonote.png" alt="" className="w-full h-full object-cover" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-heading font-bold tracking-tight text-warm-text dark:text-dark-text leading-none">
                  {t('home.title')}
                </h1>
                <p className="text-[11px] font-body text-warm-text-secondary dark:text-dark-text-secondary mt-0.5 tracking-wide">
                  {new Date().toLocaleDateString(settings.language === 'vi' ? 'vi-VN' : 'en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Right: Settings */}
            <IonButton
              fill="clear"
              onClick={() => setShowSettings(true)}
              aria-label={t('home.settings')}
              data-testid="settings-button"
              className="home-settings-btn"
            >
              <div className="w-9 h-9 rounded-xl bg-warm-surface-elevated dark:bg-dark-surface-elevated flex items-center justify-center ring-1 ring-stone-200/80 dark:ring-stone-700/50 active:scale-95 transition-transform">
                <Settings size={17} strokeWidth={1.8} className="text-warm-text-secondary dark:text-dark-text-secondary" />
              </div>
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent data-testid="home-content">
        <OfflineBanner />

        <IonRefresher
          slot="fixed"
          onIonRefresh={handleRefresh}
          disabled={isActive}
          data-testid="pull-to-refresh"
        >
          <IonRefresherContent />
        </IonRefresher>

        {/* Search */}
        <IonSearchbar
          value={searchQuery}
          onIonInput={(e) => setSearchQuery(e.detail.value || '')}
          placeholder={t('home.search')}
          data-testid="search-bar"
        />

        {/* Pending notes */}
        {pendingNotes.length > 0 && (
          <div className="px-4 pb-2" data-testid="pending-notes-section">
            {pendingNotes.map((pending) => (
              <IonItem key={pending.id} className="pending-note-item" data-testid={`pending-note-${pending.id}`}>
                <div className="w-[3px] self-stretch rounded-full mr-3.5 flex-shrink-0 bg-gold" />
                <IonLabel>
                  <h2 className="font-heading font-medium text-[0.9375rem] text-warm-text dark:text-dark-text">{pending.title}</h2>
                  <span className="text-[11px] text-warm-text-secondary dark:text-dark-text-secondary font-mono">{formatDuration(pending.duration)}</span>
                </IonLabel>
                <div className="flex items-center gap-2">
                  {pending.uploading && (
                    <div className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  )}
                  <IonBadge color="warning">
                    {pending.uploading ? t('home.uploading') : t('home.pending')}
                  </IonBadge>
                </div>
              </IonItem>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            className="flex flex-col items-center justify-center py-12 px-4 text-center"
            data-testid="error-state"
          >
            <p className="text-warm-text-secondary dark:text-dark-text-secondary mb-4">{t('home.loadError')}</p>
            <IonButton onClick={retryNoteLoad} fill="outline" data-testid="retry-load-button">
              {t('home.retryLoad')}
            </IonButton>
          </div>
        )}

        {/* Loading */}
        {loading && notes.length === 0 && (
          <div className="flex items-center justify-center py-12" data-testid="loading-state">
            <p className="text-warm-text-secondary dark:text-dark-text-secondary">{t('common.loading')}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && hasNotes && !hasFilteredNotes && (
          <div
            className="flex flex-col items-center justify-center py-16 px-4 text-center"
            data-testid="no-search-results"
          >
            <p className="text-xl font-heading font-medium text-warm-text dark:text-dark-text">
              {t('home.noSearchResults')}
            </p>
            <p className="text-warm-text-secondary dark:text-dark-text-secondary mt-2">
              {t('home.noSearchResultsHint')}
            </p>
          </div>
        )}

        {!loading && !error && !hasNotes && (
          <div
            className="flex flex-col items-center justify-center py-20 px-6 text-center"
            data-testid="empty-state"
          >
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-[32px] overflow-hidden animate-float shadow-lg shadow-terracotta/10">
                <img src="/logo_meonote.png" alt="" className="w-full h-full object-cover" aria-hidden="true" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gold rounded-full animate-pulse-record" />
            </div>
            <p className="text-xl font-heading font-semibold text-warm-text dark:text-dark-text">
              {t('home.noNotes')}
            </p>
            <p className="text-sm text-warm-text-secondary dark:text-dark-text-secondary mt-2 max-w-[240px] leading-relaxed">{t('home.noNotesHint')}</p>
          </div>
        )}

        {/* Notes grouped by date */}
        {hasFilteredNotes && (
          <div data-testid="notes-list">
            {renderSection(t('home.today'), grouped.today)}
            {renderSection(t('home.yesterday'), grouped.yesterday)}
            {renderSection(t('home.older'), grouped.older)}
          </div>
        )}

        {/* FAB Record button */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton
            onClick={handleRecord}
            disabled={isActive}
            aria-label={t('home.record')}
            data-testid="record-fab"
          >
            <Mic size={26} strokeWidth={2} className="text-white" />
          </IonFabButton>
        </IonFab>
      </IonContent>

      {/* Recording overlay */}
      <RecordingUI />

      {/* Settings modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Delete confirm */}
      <IonAlert
        isOpen={!!deleteTargetId}
        header={t('home.deleteConfirmTitle')}
        message={t('home.deleteConfirmMessage')}
        buttons={[
          { text: t('common.cancel'), role: 'cancel', handler: () => setDeleteTargetId(null) },
          { text: t('common.delete'), role: 'destructive', handler: confirmDelete },
        ]}
        onDidDismiss={() => setDeleteTargetId(null)}
        data-testid="delete-confirm-alert"
      />

      {/* Rename alert */}
      <IonAlert
        isOpen={!!renameTargetId}
        header={t('common.rename')}
        inputs={[{ name: 'title', value: renameValue, placeholder: t('detail.editTitle') }]}
        buttons={[
          { text: t('common.cancel'), role: 'cancel', handler: () => setRenameTargetId(null) },
          {
            text: t('common.save'),
            handler: (data) => {
              setRenameValue(data.title || '');
              confirmRename();
            },
          },
        ]}
        onDidDismiss={() => setRenameTargetId(null)}
        data-testid="rename-alert"
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
            handler: () => {
              setShowPermissionAlert(false);
              // On native platforms, open system settings
            },
          },
        ]}
        onDidDismiss={() => setShowPermissionAlert(false)}
        data-testid="permission-denied-alert"
      />

      {/* Init fail alert */}
      <IonAlert
        isOpen={showInitFailAlert}
        header={t('common.error')}
        message={t('recording.initFailed')}
        buttons={[{ text: t('common.ok'), handler: () => setShowInitFailAlert(false) }]}
        onDidDismiss={() => setShowInitFailAlert(false)}
        data-testid="init-fail-alert"
      />
    </IonPage>
  );
};
