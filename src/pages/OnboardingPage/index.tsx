import { useState } from 'react';
import type { FC } from 'react';
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
import { Globe, Moon } from 'lucide-react';
import { useSettings } from '@/features/settings/hooks/useSettings';
import { APP_VERSION } from '@/shared/lib/appVersion';
import type { Language, Theme } from '@/shared/types';

export const OnboardingPage: FC = () => {
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
        <div className="flex flex-col items-center justify-center min-h-full py-10 px-4">

          {/* Hero — logo with decorative glow */}
          <div className="relative mb-8 animate-fade-in">
            {/* Background glow */}
            <div className="absolute inset-0 rounded-full bg-primary-500/15 dark:bg-primary-400/10 blur-3xl scale-[2.5]" />
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-primary-200/20 dark:bg-primary-100/10 blur-2xl" />
            <div className="absolute -bottom-4 -left-8 w-20 h-20 rounded-full bg-primary-400/15 dark:bg-primary-400/8 blur-2xl" />

            {/* Logo */}
            <div className="relative w-28 h-28 rounded-[32px] overflow-hidden shadow-xl shadow-primary-500/20 dark:shadow-primary-400/10 ring-1 ring-white/20 dark:ring-white/5 animate-float">
              <img src="/logo_meonote.png" alt="MeoNote" className="w-full h-full object-cover" />
            </div>

            {/* Decorative dot */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full shadow-md shadow-primary-500/40 animate-pulse-record" />
          </div>

          {/* Title + subtitle */}
          <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-3xl font-sans font-bold tracking-tight text-text-primary dark:text-dark-text">
              {t('onboarding.title')}
            </h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mt-2 text-[0.9375rem] leading-relaxed max-w-[280px] mx-auto">
              {t('onboarding.subtitle')}
            </p>
          </div>

          {/* Settings cards — each setting in its own card */}
          <div className="w-full max-w-sm space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>

            {/* Language card */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800/50 overflow-hidden">
              <IonItem lines="none">
                <div className="flex items-center gap-3 w-full py-1">
                  <div className="w-9 h-9 rounded-xl bg-primary-500/10 dark:bg-primary-400/10 flex items-center justify-center flex-shrink-0">
                    <Globe size={17} className="text-primary-500 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-sans font-semibold text-text-primary dark:text-dark-text">
                      {t('onboarding.selectLanguage')}
                    </p>
                  </div>
                  <IonSelect
                    value={language}
                    onIonChange={(e) => handleLanguageChange(e.detail.value as Language)}
                    aria-label={t('onboarding.selectLanguage')}
                    data-testid="language-select"
                  >
                    <IonSelectOption value="en">{t('settings.languageEn')}</IonSelectOption>
                    <IonSelectOption value="vi">{t('settings.languageVi')}</IonSelectOption>
                  </IonSelect>
                </div>
              </IonItem>
            </div>

            {/* Theme card */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800/50 overflow-hidden">
              <IonItem lines="none">
                <div className="flex items-center gap-3 w-full py-1">
                  <div className="w-9 h-9 rounded-xl bg-primary-100/10 flex items-center justify-center flex-shrink-0">
                    <Moon size={17} className="text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-sans font-semibold text-text-primary dark:text-dark-text">
                      {t('onboarding.selectTheme')}
                    </p>
                  </div>
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
                </div>
              </IonItem>
            </div>

            {/* Consent card */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800/50 overflow-hidden">
              <IonItem lines="none">
                <div className="flex items-center gap-3 w-full py-1.5">
                  <IonCheckbox
                    checked={consentChecked}
                    onIonChange={(e) => setConsentChecked(e.detail.checked)}
                    data-testid="consent-checkbox"
                  />
                  <IonLabel className="text-[13px] text-text-secondary dark:text-dark-text-secondary leading-snug">
                    {t('onboarding.consent')}
                  </IonLabel>
                </div>
              </IonItem>
            </div>
          </div>

          {/* CTA button */}
          <div className="w-full max-w-sm mt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <IonButton
              expand="block"
              className="onboarding-cta w-full"
              disabled={!consentChecked}
              onClick={handleGetStarted}
              data-testid="get-started-button"
            >
              {t('onboarding.getStarted')}
            </IonButton>
          </div>

          {/* Footer — subtle brand mark */}
          <p className="text-[10px] text-text-secondary/40 dark:text-dark-text-secondary/30 mt-8 font-mono tracking-widest uppercase animate-fade-in" style={{ animationDelay: '0.4s' }}>
            MeoNote v{APP_VERSION}
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
};
