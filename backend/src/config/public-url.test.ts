import { describe, expect, it } from 'vitest'
import { resolveFrontendUrl } from './public-url'

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
})
