/**
 * Configuración frontend public-api.
 *
 * @remarks Valida valores públicos de entorno antes de iniciar o compilar la aplicación.
 */
import { validatePublicApiUrl } from './api-url-policy'

export const PUBLIC_API_URL = validatePublicApiUrl(import.meta.env.VITE_API_URL, import.meta.env.PROD, {
  allowAndroidEmulatorLocal: import.meta.env.VITE_ALLOW_ANDROID_EMULATOR_API === 'true',
})
