import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.clen.meonote',
  appName: 'Meo Note',
  webDir: 'dist',
  ios: {
    includePlugins: [
      '@capacitor/app',
      '@capacitor/haptics',
      '@capacitor/keyboard',
      '@capacitor/preferences',
      '@capacitor/status-bar',
      '@capacitor/device',
      '@capacitor/filesystem'
    ]
  }
};

export default config;
