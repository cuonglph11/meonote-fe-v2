import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonRefresher,
  IonRefresherContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonButton,
  IonButtons,
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
import { Mic, Settings, Share2, RefreshCw, Trash2, Edit3 } from 'lucide-react';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { useRecording } from '@/features/recording/hooks/useRecording';
import { useSettings } from '@/features/settings/hooks/useSettings';
import { OfflineBanner } from '@/shared/components/OfflineBanner';
import { RecordingUI } from '@/features/recording/components/RecordingUI';
import { SettingsModal } from '@/features/settings/components/SettingsModal';
import { groupNotesByDate, filterNotes, formatDuration } from '@/features/notes/services/notesService';
import { api } from '@/shared/lib/api/client';
import type { Note } from '@/shared/types';

export const HomePage: React.FC = () => {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRefresh = async (event: any) => {
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

  const renderNoteItem = (note: Note) => (
    <IonItemSliding key={note.id} data-testid={`note-item-${note.id}`}>
      <IonItem
        button
        onClick={() => handleNoteClick(note)}
        detail={note.status === 'ready'}
      >
        <IonLabel>
          <h2 className="font-medium">{note.title}</h2>
          <IonNote className="text-xs">
            {new Date(note.createdAt).toLocaleTimeString(settings.language, {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · {formatDuration(note.duration)}
          </IonNote>
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

  const renderSection = (title: string, sectionNotes: Note[]) => {
    if (sectionNotes.length === 0) return null;
    return (
      <div key={title} data-testid={`section-${title.toLowerCase()}`}>
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {title}
          </p>
        </div>
        <IonList>{sectionNotes.map(renderNoteItem)}</IonList>
      </div>
    );
  };

  return (
    <IonPage data-testid="home-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('home.title')}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={() => setShowSettings(true)}
              aria-label={t('home.settings')}
              data-testid="settings-button"
            >
              <Settings size={20} />
            </IonButton>
          </IonButtons>
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
          <div data-testid="pending-notes-section">
            {pendingNotes.map((pending) => (
              <IonItem key={pending.id} data-testid={`pending-note-${pending.id}`}>
                <IonLabel>
                  <h2>{pending.title}</h2>
                  <IonNote className="text-xs">{formatDuration(pending.duration)}</IonNote>
                </IonLabel>
                <IonBadge color="warning">
                  {pending.uploading ? t('home.uploading') : t('home.pending')}
                </IonBadge>
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
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('home.loadError')}</p>
            <IonButton onClick={retryNoteLoad} fill="outline" data-testid="retry-load-button">
              {t('home.retryLoad')}
            </IonButton>
          </div>
        )}

        {/* Loading */}
        {loading && notes.length === 0 && (
          <div className="flex items-center justify-center py-12" data-testid="loading-state">
            <p className="text-gray-400">{t('common.loading')}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && hasNotes && !hasFilteredNotes && (
          <div
            className="flex flex-col items-center justify-center py-16 px-4 text-center"
            data-testid="no-search-results"
          >
            <p className="text-xl font-medium text-gray-700 dark:text-gray-300">
              {t('home.noSearchResults')}
            </p>
            <p className="text-gray-400 dark:text-gray-500 mt-2">
              {t('home.noSearchResultsHint')}
            </p>
          </div>
        )}

        {!loading && !error && !hasNotes && (
          <div
            className="flex flex-col items-center justify-center py-16 px-4 text-center"
            data-testid="empty-state"
          >
            <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <Mic size={48} className="text-gray-300 dark:text-gray-600" aria-hidden="true" />
            </div>
            <p className="text-xl font-medium text-gray-700 dark:text-gray-300">
              {t('home.noNotes')}
            </p>
            <p className="text-gray-400 dark:text-gray-500 mt-2">{t('home.noNotesHint')}</p>
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
            <IonIcon name="mic" />
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
