import { describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import {
  CSRF_COOKIE, CSRF_HEADER, REFRESH_COOKIE, establecerSesion, limpiarSesion,
  obtenerRefreshToken, validarCsrf,
} from './session-cookies'

function responseMock() {
  return {
    cookie: vi.fn(), clearCookie: vi.fn(), setHeader: vi.fn(),
  } as unknown as Response
}

describe('cookies de sesiÃ³n', () => {
  it('separa refresh HttpOnly y CSRF legible sin exponer el refresh', () => {
    const res = responseMock()
    const csrf = establecerSesion(res, 'refresh-secret')
    expect(csrf).toHaveLength(43)
    expect(res.cookie).toHaveBeenCalledWith(REFRESH_COOKIE, 'refresh-secret', expect.objectContaining({ httpOnly: true, path: '/api/auth' }))
    expect(res.cookie).toHaveBeenCalledWith(CSRF_COOKIE, csrf, expect.objectContaining({ httpOnly: false, path: '/' }))
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
  })

  it('acepta Ãºnicamente doble envÃ­o CSRF idÃ©ntico', () => {
    const req = {
      cookies: { [CSRF_COOKIE]: 'csrf-value' },
      header: vi.fn((name: string) => name === CSRF_HEADER ? 'csrf-value' : undefined),
    } as unknown as Request
    expect(() => validarCsrf(req)).not.toThrow()
    vi.mocked(req.header).mockReturnValue('otro')
    expect(() => validarCsrf(req)).toThrowError(expect.objectContaining({ statusCode: 403, codigo: 'CSRF_INVALIDO' }))
  })

  it('lee el refresh solo desde cookie y limpia ambas cookies', () => {
    const req = { cookies: { [REFRESH_COOKIE]: 'cookie-refresh' } } as unknown as Request
    expect(obtenerRefreshToken(req)).toBe('cookie-refresh')
    const res = responseMock()
    limpiarSesion(res)
    expect(res.clearCookie).toHaveBeenCalledTimes(2)
  })

})
