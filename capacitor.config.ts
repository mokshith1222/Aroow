import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aroow.puzzle',
  appName: 'Aroow',
  webDir: 'dist',
  backgroundColor: '#09090C',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    statusBarTranslucent: true,
  },
  plugins: {
    // AdMob plugin configuration
  },
};

export default config;
