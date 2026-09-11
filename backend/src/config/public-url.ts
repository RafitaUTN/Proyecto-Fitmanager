/**
 * Configuración runtime del módulo public-url.
 *
 * @remarks Normaliza variables de entorno y políticas necesarias para ejecutar la API de forma segura.
 */
function validarUrlPublica(nodeEnv: string | undefined, raw: string | undefined, variable: string): string {
  const production = nodeEnv === 'production'
  const candidate = raw?.trim().replace(/\/$/, '') || (production ? '' : 'http://localhost:5173')
  if (!candidate) throw new Error(`[env] ${variable} es obligatoria en producción`)

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new Error(`[env] ${variable} debe ser una URL absoluta válida`)
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`[env] ${variable} debe usar HTTP o HTTPS`)
  if (production) {
    if (url.protocol !== 'https:') throw new Error(`[env] ${variable} de producción debe usar HTTPS`)
    if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
      throw new Error(`[env] ${variable} de producción no puede ser local`)
    }
  }
  return candidate
}

function firstOrigin(raw: string | undefined): string | undefined {
  return raw
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)[0]
}

export function resolvePublicAppUrl(
  nodeEnv: string | undefined,
  publicAppUrl: string | undefined,
  appUrl: string | undefined,
  frontendUrl: string | undefined,
): string {
  return validarUrlPublica(nodeEnv, publicAppUrl || appUrl || firstOrigin(frontendUrl), 'PUBLIC_APP_URL')
}

export function resolveFrontendUrls(raw: string | undefined, fallbackPublicUrl: string): string[] {
  const origins = (raw || fallbackPublicUrl)
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)

  return [...new Set(origins)]
}

export function resolveFrontendUrl(nodeEnv: string | undefined, raw: string | undefined): string {
  return validarUrlPublica(nodeEnv, firstOrigin(raw), 'FRONTEND_URL')
}
