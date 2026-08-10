export function validatePublicApiUrl(value: string | undefined, production: boolean): string {
  const candidate = value?.trim().replace(/\/$/, '')
  if (!candidate) throw new Error('VITE_API_URL es obligatoria para compilar y ejecutar FitManager')

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new Error('VITE_API_URL debe ser una URL absoluta válida')
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('VITE_API_URL debe usar HTTP o HTTPS')
  if (!url.pathname.endsWith('/api')) throw new Error('VITE_API_URL debe terminar en /api')
  if (production) {
    if (url.protocol !== 'https:') throw new Error('VITE_API_URL de producción debe usar HTTPS')
    if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
      throw new Error('VITE_API_URL de producción no puede apuntar a una dirección local')
    }
  }
  return candidate
}
