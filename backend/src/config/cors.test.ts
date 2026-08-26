/**
 * Pruebas automatizadas para validar el comportamiento de cors.test.
 *
 * @remarks Documenta escenarios esperados, errores controlados y regresiones del módulo relacionado.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('CORS por entorno', () => {
  it('acepta solo el origen local configurado fuera de preview', async () => {
    vi.stubEnv('APP_ENV', 'development')
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173')
    const { origenPermitido } = await import('./cors')
    expect(origenPermitido('http://localhost:5173')).toBe(true)
    expect(origenPermitido('http://localhost')).toBe(true)
    expect(origenPermitido('https://localhost')).toBe(true)
    expect(origenPermitido('capacitor://localhost')).toBe(true)
    expect(origenPermitido('ionic://localhost')).toBe(true)
    expect(origenPermitido('https://malicioso.vercel.app')).toBe(false)
  })

  it('limita previews HTTPS al sufijo del equipo', async () => {
    vi.stubEnv('APP_ENV', 'preview')
    vi.stubEnv('FRONTEND_URL', 'https://fitmanager.example')
    vi.stubEnv('PREVIEW_ORIGIN_SUFFIX', '-progra2.vercel.app')
    const { origenPermitido } = await import('./cors')
    expect(origenPermitido('https://fitmanager-frontend-abc-progra2.vercel.app')).toBe(true)
    expect(origenPermitido('http://fitmanager-frontend-abc-progra2.vercel.app')).toBe(false)
    expect(origenPermitido('https://fitmanager-frontend-abc-otro.vercel.app')).toBe(false)
  })
})
