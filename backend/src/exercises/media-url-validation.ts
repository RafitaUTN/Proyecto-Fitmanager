const HOST_PERMITIDO = 'wger.de'

export type ValidacionUrl =
  | { ok: true; url: string; host: string }
  | { ok: false; razon: string }

export function esHostMediaPermitido(host: string): boolean {
  const h = (host || '').toLowerCase().replace(/\.$/, '')
  return h === HOST_PERMITIDO || h.endsWith(`.${HOST_PERMITIDO}`)
}

export function validarUrlMedia(url: string): ValidacionUrl {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) {
    return { ok: false, razon: 'URL vacía o demasiado larga' }
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, razon: 'URL mal formada' }
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, razon: 'El protocolo debe ser HTTPS' }
  }
  if (!parsed.hostname) {
    return { ok: false, razon: 'La URL no tiene host' }
  }
  if (!esHostMediaPermitido(parsed.hostname)) {
    return { ok: false, razon: `Host no permitido: ${parsed.hostname}` }
  }

  return { ok: true, url, host: parsed.hostname }
}

export function validarBaseUrlMedia(url: string): string {
  const validacion = validarUrlMedia(url)
  if (!validacion.ok) {
    throw new Error(`[media] Base URL inválida: ${validacion.razon}`)
  }
  return url.replace(/\/+$/, '')
}
