import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Theme, Language, AppSettings } from '../types';
import { settingsService, applyTheme } from '../services/settingsService';
import { getUserToken } from '@/shared/lib/api/client';

interface SettingsContextValue {
  settings: AppSettings;
  userToken: string;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  completeOnboarding: () => void;
  clearAllData: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(() => settingsService.getSettings());
  const [userToken, setUserToken] = useState<string>('');

  useEffect(() => {
    getUserToken().then(setUserToken);
  }, []);

  // Apply theme on mount and when system preference changes
  useEffect(() => {
    applyTheme(settings.theme);

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [settings.theme]);

  // Apply language on mount
  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language, i18n]);

  const setTheme = useCallback((theme: Theme) => {
    settingsService.setTheme(theme);
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const setLanguage = useCallback(
    (language: Language) => {
      settingsService.setLanguage(language);
      i18n.changeLanguage(language);
      setSettings((prev) => ({ ...prev, language }));
    },
    [i18n]
  );

  const completeOnboarding = useCallback(() => {
    settingsService.completeOnboarding();
    setSettings((prev) => ({ ...prev, onboardingCompleted: true }));
  }, []);

  const clearAllData = useCallback(async () => {
    await settingsService.clearAllData();
    window.location.reload();
  }, []);

  const contextValue = useMemo<SettingsContextValue>(() => ({
    settings, userToken, setTheme, setLanguage, completeOnboarding, clearAllData,
  }), [settings, userToken, setTheme, setLanguage, completeOnboarding, clearAllData]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
