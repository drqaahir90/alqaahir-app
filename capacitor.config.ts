import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drqaahir90.alqaahirapp',
  appName: 'QCAP',
  webDir: 'dist',
  server: {
    url: 'https://qcap-platform.web.app/',
    cleartext: true
  }
};

export default config;
