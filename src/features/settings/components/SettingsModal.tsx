import React, { useState } from 'react';
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
import { X } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import type { Theme, Language } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LegalView = 'terms' | 'privacy' | null;

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0';
const TERMS_URL = 'https://meonote.app/terms';
const PRIVACY_URL = 'https://meonote.app/privacy';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
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
            <IonTitle>{t('settings.title')}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose} aria-label={t('common.close')}>
                <X size={20} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          <IonList>
            {/* Language */}
            <IonItem data-testid="settings-language-item">
              <IonLabel>{t('settings.language')}</IonLabel>
              <IonSelect
                value={settings.language}
                onIonChange={(e) => setLanguage(e.detail.value as Language)}
                data-testid="settings-language-select"
              >
                <IonSelectOption value="en">{t('settings.languageEn')}</IonSelectOption>
                <IonSelectOption value="vi">{t('settings.languageVi')}</IonSelectOption>
              </IonSelect>
            </IonItem>

            {/* Theme */}
            <IonItem data-testid="settings-theme-item">
              <IonLabel>{t('settings.theme')}</IonLabel>
              <IonSelect
                value={settings.theme}
                onIonChange={(e) => setTheme(e.detail.value as Theme)}
                data-testid="settings-theme-select"
              >
                <IonSelectOption value="light">{t('settings.themeLight')}</IonSelectOption>
                <IonSelectOption value="dark">{t('settings.themeDark')}</IonSelectOption>
                <IonSelectOption value="system">{t('settings.themeSystem')}</IonSelectOption>
              </IonSelect>
            </IonItem>

            {/* Terms of Service */}
            <IonItem
              button
              onClick={() => setLegalView('terms')}
              data-testid="settings-terms-item"
            >
              <IonLabel>{t('settings.termsOfService')}</IonLabel>
            </IonItem>

            {/* Privacy Policy */}
            <IonItem
              button
              onClick={() => setLegalView('privacy')}
              data-testid="settings-privacy-item"
            >
              <IonLabel>{t('settings.privacyPolicy')}</IonLabel>
            </IonItem>

            {/* User ID */}
            <IonItem data-testid="settings-userid-item">
              <IonLabel>
                <p>{t('settings.userId')}</p>
                <p
                  className="text-xs text-gray-500 font-mono mt-1"
                  data-testid="settings-userid-value"
                >
                  {truncatedToken}
                </p>
              </IonLabel>
            </IonItem>

            {/* App Version */}
            <IonItem data-testid="settings-version-item">
              <IonLabel>
                <p>{t('settings.version')}</p>
                <p
                  className="text-xs text-gray-500 mt-1"
                  data-testid="settings-version-value"
                >
                  {APP_VERSION}
                </p>
              </IonLabel>
            </IonItem>
          </IonList>

          {/* Clear All Data */}
          <div className="mt-6 px-4">
            <IonButton
              expand="block"
              color="danger"
              fill="outline"
              onClick={handleClearData}
              data-testid="settings-clear-data-button"
            >
              {t('settings.clearData')}
            </IonButton>
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
