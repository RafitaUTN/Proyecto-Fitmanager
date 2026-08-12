import { describe, it, expect } from 'vitest'
import { esHostMediaPermitido, validarBaseUrlMedia, validarUrlMedia } from './media-url-validation'

describe('esHostMediaPermitido', () => {
  it('acepta el dominio exacto y sus subdominios', () => {
    expect(esHostMediaPermitido('wger.de')).toBe(true)
    expect(esHostMediaPermitido('images.wger.de')).toBe(true)
    expect(esHostMediaPermitido('WGER.DE')).toBe(true)
    expect(esHostMediaPermitido('media.wger.de.')).toBe(true)
  })

  it('rechaza dominios que solo terminan en wger.de (sufijos falsos)', () => {
    expect(esHostMediaPermitido('wger.de.evil.com')).toBe(false)
    expect(esHostMediaPermitido('notwger.de')).toBe(false)
    expect(esHostMediaPermitido('evilwger.de')).toBe(false)
    expect(esHostMediaPermitido('wger.de.com')).toBe(false)
  })

  it('rechaza hosts vacíos, IPs y dominios arbitrarios', () => {
    expect(esHostMediaPermitido('')).toBe(false)
    expect(esHostMediaPermitido('127.0.0.1')).toBe(false)
    expect(esHostMediaPermitido('evil.com')).toBe(false)
  })
})

describe('validarUrlMedia', () => {
  it('acepta URLs HTTPS de wger.de y subdominios', () => {
    const resultado = validarUrlMedia('https://wger.de/media/exercise-images/1962/xxx.png')
    expect(resultado).toMatchObject({ ok: true, host: 'wger.de' })

    const subdominio = validarUrlMedia('https://images.wger.de/foo.png')
    expect(subdominio.ok).toBe(true)
    if (subdominio.ok) expect(subdominio.host).toBe('images.wger.de')
  })

  it('rechaza protocolos que no sean HTTPS', () => {
    expect(validarUrlMedia('http://wger.de/foo.png').ok).toBe(false)
    expect(validarUrlMedia('file:///etc/passwd').ok).toBe(false)
    expect(validarUrlMedia('ftp://wger.de/foo').ok).toBe(false)
  })

  it('rechaza hosts externos (anti-SSRF)', () => {
    expect(validarUrlMedia('https://evil.com/foo.png').ok).toBe(false)
    expect(validarUrlMedia('https://127.0.0.1/admin').ok).toBe(false)
    expect(validarUrlMedia('https://wger.de.evil.com/foo').ok).toBe(false)
    expect(validarUrlMedia('https://notwger.de/foo').ok).toBe(false)
    expect(validarUrlMedia('https://user@wger.de@evil.com/foo').ok).toBe(false)
    expect(validarUrlMedia('https://wger.de:443@evil.com/foo').ok).toBe(false)
  })

  it('rechaza entradas mal formadas o vacías', () => {
    expect(validarUrlMedia('').ok).toBe(false)
    expect(validarUrlMedia('no-es-una-url').ok).toBe(false)
    expect(validarUrlMedia('x'.repeat(3000)).ok).toBe(false)
    expect(validarUrlMedia(null as unknown as string).ok).toBe(false)
  })
})

describe('validarBaseUrlMedia', () => {
  it('normaliza y devuelve la base sin barra final', () => {
    expect(validarBaseUrlMedia('https://wger.de/')).toBe('https://wger.de')
    expect(validarBaseUrlMedia('https://wger.de')).toBe('https://wger.de')
  })

  it('lanza error si la base no es un host permitido', () => {
    expect(() => validarBaseUrlMedia('http://api.evil.com')).toThrow(/Base URL inválida/)
  })
})
