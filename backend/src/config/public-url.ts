export function resolveFrontendUrl(nodeEnv: string | undefined, raw: string | undefined): string {
  const production = nodeEnv === 'production'
  const candidate = raw?.trim().replace(/\/$/, '') || (production ? '' : 'http://localhost:5173')
  if (!candidate) throw new Error('[env] FRONTEND_URL es obligatoria en producción')

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new Error('[env] FRONTEND_URL debe ser una URL absoluta válida')
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('[env] FRONTEND_URL debe usar HTTP o HTTPS')
  if (production) {
    if (url.protocol !== 'https:') throw new Error('[env] FRONTEND_URL de producción debe usar HTTPS')
    if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
      throw new Error('[env] FRONTEND_URL de producción no puede ser local')
    }
  }
  return candidate
}
