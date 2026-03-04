import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonCheckbox,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonItem,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/hooks/useSettings';
import type { Language, Theme } from '@/shared/types';

export const OnboardingPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { settings, setLanguage, setTheme, completeOnboarding } = useSettings();

  const [language, setLocalLanguage] = useState<Language>(settings.language);
  const [theme, setLocalTheme] = useState<Theme>(settings.theme);
  const [consentChecked, setConsentChecked] = useState(false);

  const handleLanguageChange = (lang: Language) => {
    setLocalLanguage(lang);
    setLanguage(lang); // live preview
  };

  const handleThemeChange = (thm: Theme) => {
    setLocalTheme(thm);
    setTheme(thm); // live preview
  };

  const handleGetStarted = () => {
    completeOnboarding();
    history.push('/home');
  };

  return (
    <IonPage data-testid="onboarding-page">
      <IonContent className="ion-padding">
        <div className="flex flex-col items-center justify-center min-h-full gap-8 py-12">
          {/* Header */}
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl" role="img" aria-label="microphone">🎙️</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('onboarding.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{t('onboarding.subtitle')}</p>
          </div>

          {/* Settings form */}
          <div className="w-full max-w-sm space-y-4">
            {/* Language */}
            <div>
              <IonLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t('onboarding.selectLanguage')}
              </IonLabel>
              <IonItem>
                <IonSelect
                  value={language}
                  onIonChange={(e) => handleLanguageChange(e.detail.value as Language)}
                  aria-label={t('onboarding.selectLanguage')}
                  data-testid="language-select"
                >
                  <IonSelectOption value="en">{t('settings.languageEn')}</IonSelectOption>
                  <IonSelectOption value="vi">{t('settings.languageVi')}</IonSelectOption>
                </IonSelect>
              </IonItem>
            </div>

            {/* Theme */}
            <div>
              <IonLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t('onboarding.selectTheme')}
              </IonLabel>
              <IonItem>
                <IonSelect
                  value={theme}
                  onIonChange={(e) => handleThemeChange(e.detail.value as Theme)}
                  aria-label={t('onboarding.selectTheme')}
                  data-testid="theme-select"
                >
                  <IonSelectOption value="light">{t('settings.themeLight')}</IonSelectOption>
                  <IonSelectOption value="dark">{t('settings.themeDark')}</IonSelectOption>
                  <IonSelectOption value="system">{t('settings.themeSystem')}</IonSelectOption>
                </IonSelect>
              </IonItem>
            </div>

            {/* Consent */}
            <IonItem lines="none">
              <IonCheckbox
                checked={consentChecked}
                onIonChange={(e) => setConsentChecked(e.detail.checked)}
                data-testid="consent-checkbox"
              />
              <IonLabel className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('onboarding.consent')}
              </IonLabel>
            </IonItem>
          </div>

          {/* Get Started button */}
          <IonButton
            expand="block"
            className="w-full max-w-sm"
            disabled={!consentChecked}
            onClick={handleGetStarted}
            data-testid="get-started-button"
          >
            {t('onboarding.getStarted')}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};
