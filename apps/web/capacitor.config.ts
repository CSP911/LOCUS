import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.locus.app',
  appName: 'LOCUS',
  webDir: 'out',
  server: {
    // https 스킴으로 로딩해야 외부 HTTPS API 호출 가능
    androidScheme: 'https',
    allowNavigation: ['*'],
  },
};

export default config;
