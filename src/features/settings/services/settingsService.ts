import type { Theme, Language, AppSettings } from '../types';

const KEYS = {
  THEME: 'meonote_theme',
  LANGUAGE: 'meonote_language',
  ONBOARDING_COMPLETED: 'meonote_onboarding_completed',
  USER_TOKEN: 'meonote_user_token',
};

export const settingsService = {
  getSettings(): AppSettings {
    return {
      theme: (localStorage.getItem(KEYS.THEME) as Theme) || 'system',
      language: (localStorage.getItem(KEYS.LANGUAGE) as Language) || 'en',
      onboardingCompleted: localStorage.getItem(KEYS.ONBOARDING_COMPLETED) === 'true',
    };
  },

  setTheme(theme: Theme): void {
    localStorage.setItem(KEYS.THEME, theme);
    applyTheme(theme);
  },

  setLanguage(language: Language): void {
    localStorage.setItem(KEYS.LANGUAGE, language);
  },

  completeOnboarding(): void {
    localStorage.setItem(KEYS.ONBOARDING_COMPLETED, 'true');
  },

  getUserToken(): string {
    let token = localStorage.getItem(KEYS.USER_TOKEN);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(KEYS.USER_TOKEN, token);
    }
    return token;
  },

  clearAllData(): void {
    localStorage.clear();
  },
};

export function applyTheme(theme: Theme): void {
  const html = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  html.classList.remove('light', 'dark');

  if (theme === 'light') {
    html.classList.add('light');
    html.setAttribute('data-theme', 'light');
    html.style.colorScheme = 'light';
  } else if (theme === 'dark') {
    html.classList.add('dark');
    html.setAttribute('data-theme', 'dark');
    html.style.colorScheme = 'dark';
  } else {
    // system
    if (prefersDark) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.add('light');
      html.setAttribute('data-theme', 'light');
      html.style.colorScheme = 'light';
    }
  }
}
