import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Permanent Android package name — cannot change after the first Play Store release.
  appId: 'com.fadzyll.motorcycle',
  appName: 'Motorcycle System',
  webDir: 'dist',
  android: {
    // Allow http:// only in debug builds (e.g. dev live reload); release builds stay https-only.
    allowMixedContent: false,
  },
  // Live reload while developing on a phone (same Wi-Fi). Never commit this enabled:
  // server: { url: 'http://192.168.1.10:5173', cleartext: true },
}

export default config
