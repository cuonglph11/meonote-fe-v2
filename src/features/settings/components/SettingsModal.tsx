import { useState } from 'react';
import type { FC } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonButtons,
  IonAlert,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { X, Globe, Moon, FileText, Shield, User, Info, Trash2, ChevronRight } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { APP_VERSION } from '@/shared/lib/appVersion';
import type { Theme, Language } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LegalView = 'terms' | 'privacy' | null;
const TERMS_URL = 'https://meonote-home.clen.dev/terms-of-service';
const PRIVACY_URL = 'https://meonote-home.clen.dev/privacy-policy';

export const SettingsModal: FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { settings, userToken, setTheme, setLanguage, clearAllData } = useSettings();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [legalView, setLegalView] = useState<LegalView>(null);

  const truncatedToken = userToken
    ? `${userToken.substring(0, 8)}...${userToken.substring(userToken.length - 4)}`
    : '—';

  const handleClearData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearData = () => {
    setShowClearConfirm(false);
    clearAllData();
  };

  if (legalView) {
    const url = legalView === 'terms' ? TERMS_URL : PRIVACY_URL;
    const title = legalView === 'terms' ? t('settings.termsOfService') : t('settings.privacyPolicy');

    return (
      <IonModal isOpen={isOpen} onDidDismiss={onClose} data-testid="legal-modal">
        <IonHeader>
          <IonToolbar>
            <IonTitle>{title}</IonTitle>
            <IonButtons slot="start">
              <IonButton onClick={() => setLegalView(null)} aria-label={t('common.back')}>
                <X size={20} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <iframe
            src={url}
            title={title}
            className="w-full h-full border-0"
            data-testid="legal-iframe"
          />
        </IonContent>
      </IonModal>
    );
  }

  return (
    <>
      <IonModal
        isOpen={isOpen}
        onDidDismiss={onClose}
        breakpoints={[0, 0.75, 1]}
        initialBreakpoint={0.75}
        data-testid="settings-modal"
      >
        <IonHeader>
          <IonToolbar>
            <div slot="start" className="w-10" />
            <IonTitle>{t('settings.title')}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose} aria-label={t('common.close')}>
                <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
                  <X size={16} className="text-text-secondary dark:text-neutral-400" />
                </div>
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          <div className="animate-fade-in">
            {/* Preferences Section */}
            <div className="mb-6">
              <h3 className="text-xs font-sans font-semibold text-text-secondary dark:text-neutral-400 uppercase tracking-wider px-2 mb-2">
                {t('settings.title')}
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-stone-100 dark:border-stone-800/50">
                <IonList>
                  <IonItem data-testid="settings-language-item">
                    <div className="flex items-center gap-3 w-full py-1">
                      <div className="w-8 h-8 rounded-xl bg-primary-500/10 dark:bg-primary-400/10 flex items-center justify-center flex-shrink-0">
                        <Globe size={16} className="text-primary-500 dark:text-primary-400" />
                      </div>
                      <IonLabel className="font-medium">{t('settings.language')}</IonLabel>
                      <IonSelect
                        value={settings.language}
                        onIonChange={(e) => setLanguage(e.detail.value as Language)}
                        data-testid="settings-language-select"
                      >
                        <IonSelectOption value="en">{t('settings.languageEn')}</IonSelectOption>
                        <IonSelectOption value="vi">{t('settings.languageVi')}</IonSelectOption>
                      </IonSelect>
                    </div>
                  </IonItem>

                  <IonItem data-testid="settings-theme-item">
                    <div className="flex items-center gap-3 w-full py-1">
                      <div className="w-8 h-8 rounded-xl bg-primary-100/10 flex items-center justify-center flex-shrink-0">
                        <Moon size={16} className="text-primary-500" />
                      </div>
                      <IonLabel className="font-medium">{t('settings.theme')}</IonLabel>
                      <IonSelect
                        value={settings.theme}
                        onIonChange={(e) => setTheme(e.detail.value as Theme)}
                        data-testid="settings-theme-select"
                      >
                        <IonSelectOption value="light">{t('settings.themeLight')}</IonSelectOption>
                        <IonSelectOption value="dark">{t('settings.themeDark')}</IonSelectOption>
                        <IonSelectOption value="system">{t('settings.themeSystem')}</IonSelectOption>
                      </IonSelect>
                    </div>
                  </IonItem>
                </IonList>
              </div>
            </div>

            {/* Legal Section */}
            <div className="mb-6">
              <h3 className="text-xs font-sans font-semibold text-text-secondary dark:text-neutral-400 uppercase tracking-wider px-2 mb-2">
                {t('settings.legal')}
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-stone-100 dark:border-stone-800/50">
                <IonList>
                  <IonItem
                    button
                    onClick={() => setLegalView('terms')}
                    data-testid="settings-terms-item"
                  >
                    <div className="flex items-center gap-3 w-full py-1">
                      <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-text-secondary dark:text-neutral-400" />
                      </div>
                      <IonLabel className="font-medium">{t('settings.termsOfService')}</IonLabel>
                      <ChevronRight size={16} className="text-stone-300 dark:text-stone-600 flex-shrink-0" />
                    </div>
                  </IonItem>

                  <IonItem
                    button
                    onClick={() => setLegalView('privacy')}
                    data-testid="settings-privacy-item"
                  >
                    <div className="flex items-center gap-3 w-full py-1">
                      <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Shield size={16} className="text-text-secondary dark:text-neutral-400" />
                      </div>
                      <IonLabel className="font-medium">{t('settings.privacyPolicy')}</IonLabel>
                      <ChevronRight size={16} className="text-stone-300 dark:text-stone-600 flex-shrink-0" />
                    </div>
                  </IonItem>
                </IonList>
              </div>
            </div>

            {/* About Section */}
            <div className="mb-6">
              <h3 className="text-xs font-sans font-semibold text-text-secondary dark:text-neutral-400 uppercase tracking-wider px-2 mb-2">
                {t('settings.about')}
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-stone-100 dark:border-stone-800/50">
                <IonList>
                  <IonItem data-testid="settings-userid-item">
                    <div className="flex items-center gap-3 w-full py-1">
                      <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-text-secondary dark:text-neutral-400" />
                      </div>
                      <IonLabel>
                        <p className="font-medium">{t('settings.userId')}</p>
                        <p
                          className="text-xs text-text-secondary dark:text-neutral-400 font-mono mt-0.5 opacity-70"
                          data-testid="settings-userid-value"
                        >
                          {truncatedToken}
                        </p>
                      </IonLabel>
                    </div>
                  </IonItem>

                  <IonItem data-testid="settings-version-item">
                    <div className="flex items-center gap-3 w-full py-1">
                      <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Info size={16} className="text-text-secondary dark:text-neutral-400" />
                      </div>
                      <IonLabel>
                        <p className="font-medium">{t('settings.version')}</p>
                        <p
                          className="text-xs text-text-secondary dark:text-neutral-400 mt-0.5 opacity-70"
                          data-testid="settings-version-value"
                        >
                          {APP_VERSION}
                        </p>
                      </IonLabel>
                    </div>
                  </IonItem>
                </IonList>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mb-6">
              <div className="bg-red-50/60 dark:bg-red-950/20 rounded-2xl p-4 border border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <Trash2 size={16} className="text-red-500 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-semibold text-red-700 dark:text-red-300">
                      {t('settings.dangerZone')}
                    </h3>
                    <p className="text-xs text-red-500/70 dark:text-red-400/60 mt-0.5">
                      {t('settings.cannotBeUndone')}
                    </p>
                  </div>
                </div>
                <IonButton
                  expand="block"
                  color="danger"
                  fill="outline"
                  onClick={handleClearData}
                  className="settings-clear-btn"
                  data-testid="settings-clear-data-button"
                >
                  {t('settings.clearData')}
                </IonButton>
              </div>
            </div>
          </div>
        </IonContent>
      </IonModal>

      {/* Clear data confirm */}
      <IonAlert
        isOpen={showClearConfirm}
        header={t('settings.clearDataConfirmTitle')}
        message={t('settings.clearDataConfirmMessage')}
        buttons={[
          {
            text: t('common.cancel'),
            role: 'cancel',
            handler: () => setShowClearConfirm(false),
          },
          {
            text: t('settings.clearData'),
            role: 'destructive',
            handler: confirmClearData,
          },
        ]}
        onDidDismiss={() => setShowClearConfirm(false)}
        data-testid="clear-data-alert"
      />
    </>
  );
};
