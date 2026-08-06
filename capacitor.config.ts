import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.conception.jobflow',
  appName: 'Conception Job Flow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
