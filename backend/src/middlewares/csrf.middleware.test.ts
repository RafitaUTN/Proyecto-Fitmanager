import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

import { csrfMiddleware, RUTAS_ACCION_ANONIMAS } from './csrf.middleware'

function response() {
  return {} as Response
}

function makeReq(path: string, method = 'POST', refreshCookie?: string, csrfCookie?: string, header?: string) {
  const cookies: Record<string, string> = {}
  if (refreshCookie !== undefined) cookies.fitmanager_refresh = refreshCookie
  if (csrfCookie !== undefined) cookies.fitmanager_csrf = csrfCookie
  return {
    method,
    path,
    cookies,
    header: vi.fn(() => header),
  } as unknown as Request
}

describe('csrfMiddleware', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('expone el listado de rutas anónimas de acción', () => {
    expect([...RUTAS_ACCION_ANONIMAS].sort()).toEqual([
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/setup-password',
      '/api/gimnasios',
    ])
  })

  it('no exige CSRF en rutas anónimas de acción aunque exista una cookie de refresh obsoleta', () => {
    const next = vi.fn()
    expect(() =>
      csrfMiddleware(makeReq('/api/auth/setup-password', 'POST', 'refresh-obsoleta'), response(), next),
    ).not.toThrow()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('exime reset-password, forgot-password y registro de gimnasio', () => {
    for (const ruta of ['/api/auth/reset-password', '/api/auth/forgot-password', '/api/gimnasios']) {
      const next = vi.fn()
      expect(() => csrfMiddleware(makeReq(ruta, 'POST', 'refresh-obsoleta'), response(), next)).not.toThrow()
      expect(next).toHaveBeenCalledTimes(1)
    }
  })

  it('exige doble envío CSRF cuando existe sesión (cookie de refresh)', () => {
    expect(() =>
      csrfMiddleware(makeReq('/api/usuarios', 'POST', 'refresh-vigente', 'cookie-csrf', undefined), response(), vi.fn()),
    ).toThrowError(expect.objectContaining({ statusCode: 403, codigo: 'CSRF_INVALIDO' }))
  })

  it('rechaza cabecera CSRF que no coincide con la cookie', () => {
    expect(() =>
      csrfMiddleware(makeReq('/api/usuarios', 'POST', 'refresh-vigente', 'cookie-csrf', 'otro'), response(), vi.fn()),
    ).toThrowError(expect.objectContaining({ statusCode: 403, codigo: 'CSRF_INVALIDO' }))
  })

  it('acepta doble envío idéntico en rutas autenticadas', () => {
    const next = vi.fn()
    expect(() =>
      csrfMiddleware(makeReq('/api/usuarios', 'POST', 'refresh-vigente', 'cookie-csrf', 'cookie-csrf'), response(), next),
    ).not.toThrow()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('no exige CSRF cuando no hay cookie de refresh (sesión inexistente)', () => {
    const next = vi.fn()
    expect(() => csrfMiddleware(makeReq('/api/usuarios', 'POST'), response(), next)).not.toThrow()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('nunca bloquea métodos seguros', () => {
    const next = vi.fn()
    expect(() =>
      csrfMiddleware(makeReq('/api/usuarios', 'GET', 'refresh-vigente', 'cookie-csrf', 'otro'), response(), next),
    ).not.toThrow()
    expect(next).toHaveBeenCalledTimes(1)
  })
})
