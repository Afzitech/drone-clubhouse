import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aeroforge.app',
  appName: 'AeroForge',
  server: {
    url: 'https://drone-clubhouse.vercel.app',
    cleartext: false
  }
};

export default config;
