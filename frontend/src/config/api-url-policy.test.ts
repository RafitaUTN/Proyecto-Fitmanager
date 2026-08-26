/**
 * Pruebas automatizadas para validar el comportamiento de api-url-policy.test.
 *
 * @remarks Documenta escenarios esperados, errores controlados y regresiones del módulo relacionado.
 */
import { describe, expect, it } from 'vitest'
import { validatePublicApiUrl } from './api-url-policy'

describe('configuración pública del API', () => {
  it('falla cerrada si falta la variable', () => {
    expect(() => validatePublicApiUrl(undefined, true)).toThrow(/obligatoria/)
  })

  it.each([
    'http://localhost:3000/api',
    'http://127.0.0.1:3000/api',
    'http://api.example.com/api',
    'https://api.example.com/v1',
  ])('rechaza en producción %s', (value) => {
    expect(() => validatePublicApiUrl(value, true)).toThrow()
  })

  it('acepta HTTPS público y normaliza la barra final', () => {
    expect(validatePublicApiUrl('https://api.fitmanager.example/api/', true)).toBe('https://api.fitmanager.example/api')
  })

  it('conserva localhost solo en desarrollo', () => {
    expect(validatePublicApiUrl('http://localhost:3000/api', false)).toBe('http://localhost:3000/api')
  })

  it('permite 10.0.2.2 solo cuando se habilita el modo móvil local', () => {
    expect(() => validatePublicApiUrl('http://10.0.2.2:3000/api', true)).toThrow()
    expect(validatePublicApiUrl('http://10.0.2.2:3000/api', true, { allowAndroidEmulatorLocal: true })).toBe(
      'http://10.0.2.2:3000/api',
    )
  })
})
