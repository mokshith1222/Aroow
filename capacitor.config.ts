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
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#FBBF24",
      sound: "beep.wav",
    },
  },
};

export default config;
