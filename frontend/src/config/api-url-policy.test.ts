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
    expect(validatePublicApiUrl('https://fitmanager-backend-nine.vercel.app/api/', true))
      .toBe('https://fitmanager-backend-nine.vercel.app/api')
  })

  it('conserva localhost solo en desarrollo', () => {
    expect(validatePublicApiUrl('http://localhost:3000/api', false)).toBe('http://localhost:3000/api')
  })
})
