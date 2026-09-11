/**
 * Pruebas automatizadas para validar el comportamiento de public-url.test.
 *
 * @remarks Documenta escenarios esperados, errores controlados y regresiones del módulo relacionado.
 */
import { describe, expect, it } from 'vitest'
import { resolveFrontendUrl, resolveFrontendUrls, resolvePublicAppUrl } from './public-url'

describe('URL pública del frontend', () => {
  it('permite el valor local por defecto solo en desarrollo', () => {
    expect(resolveFrontendUrl('development', undefined)).toBe('http://localhost:5173')
  })

  it('falla cerrada sin origen en producción', () => {
    expect(() => resolveFrontendUrl('production', undefined)).toThrow(/obligatoria/)
  })

  it.each(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://fitmanager.example.com'])(
    'rechaza %s en producción',
    (value) => expect(() => resolveFrontendUrl('production', value)).toThrow(),
  )

  it('acepta y normaliza el origen HTTPS público', () => {
    expect(resolveFrontendUrl('production', 'https://frontend.vercel.app/')).toBe('https://frontend.vercel.app')
  })

  it('usa PUBLIC_APP_URL como URL canónica para correos', () => {
    expect(resolvePublicAppUrl('production', 'https://fitmanager-saas.vercel.app/', undefined, undefined)).toBe(
      'https://fitmanager-saas.vercel.app',
    )
  })

  it('usa solo el primer FRONTEND_URL heredado si contiene varios origins', () => {
    expect(
      resolvePublicAppUrl(
        'production',
        undefined,
        undefined,
        'https://fitmanager-saas.vercel.app,https://frontend-progra2.vercel.app',
      ),
    ).toBe('https://fitmanager-saas.vercel.app')
  })

  it('separa origins CORS de la URL canónica de correo', () => {
    expect(
      resolveFrontendUrls(
        'https://fitmanager-saas.vercel.app, https://frontend-progra2.vercel.app/',
        'https://fitmanager-saas.vercel.app',
      ),
    ).toEqual(['https://fitmanager-saas.vercel.app', 'https://frontend-progra2.vercel.app'])
  })
})
