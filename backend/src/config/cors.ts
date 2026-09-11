/**
 * Configuración runtime del módulo cors.
 *
 * @remarks Normaliza variables de entorno y políticas necesarias para ejecutar la API de forma segura.
 */
import { env } from './env'

const configuredOrigins = env.frontendUrls

const capacitorOrigins = ['http://localhost', 'https://localhost', 'capacitor://localhost', 'ionic://localhost']

export function origenPermitido(origin: string | undefined): boolean {
  if (!origin) return true
  if (configuredOrigins.includes(origin)) return true
  if (capacitorOrigins.includes(origin)) return true

  if (env.appEnv === 'preview' && env.previewOriginSuffix) {
    try {
      const url = new URL(origin)
      return url.protocol === 'https:' && url.hostname.endsWith(env.previewOriginSuffix)
    } catch {
      return false
    }
  }

  return false
}

export const corsOrigin: import('cors').CorsOptions['origin'] = (origin, callback) => {
  const permitido = origenPermitido(origin)
  callback(permitido ? null : new Error('Origen no permitido por CORS'), permitido)
}
