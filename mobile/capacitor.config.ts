import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Configuración móvil de FitManager.
 *
 * @remarks Empaqueta el frontend dentro del APK para que la app abra como aplicación móvil,
 * sin navegar a Vercel ni depender de una URL protegida para renderizar la interfaz.
 */
const useAndroidEmulatorLocalApi = process.env.VITE_ALLOW_ANDROID_EMULATOR_API === 'true'

const config: CapacitorConfig = {
  appId: 'com.fitmanager.saas',
  appName: 'FitManager',
  webDir: '../frontend/dist',
  server: {
    androidScheme: useAndroidEmulatorLocalApi ? 'http' : 'https',
    cleartext: useAndroidEmulatorLocalApi,
    allowNavigation: ['*.vercel.app', 'vercel.app'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#090909',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#090909',
      style: 'DARK',
    },
  },
}

export default config
