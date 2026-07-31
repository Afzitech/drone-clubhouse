import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aeroforge.app',
  appName: 'AeroForge',
  server: {
    url: 'https://imuaeroforge.vercel.app/',
    cleartext: false
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;