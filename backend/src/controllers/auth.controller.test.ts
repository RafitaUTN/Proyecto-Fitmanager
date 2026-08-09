import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { authController } from './auth.controller'
import { authService } from '../services/auth.service'
import { CSRF_COOKIE, CSRF_HEADER, REFRESH_COOKIE } from '../lib/session-cookies'

function responseMock() {
  const response = {
    cookie: vi.fn(), clearCookie: vi.fn(), setHeader: vi.fn(), json: vi.fn(), status: vi.fn(),
  }
  response.status.mockReturnValue(response)
  return response as unknown as Response
}

afterEach(() => vi.restoreAllMocks())

describe('auth controller cookie boundary', () => {
  it('login entrega access+CSRF y conserva refresh solo en HttpOnly', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue({
      token: 'access', refreshToken: 'refresh-secret',
      usuario: { id_usuario: 1, id_gimnasio: 2, nombre_gimnasio: 'Gym', nombre: 'Ada', apellido: 'L', correo: 'a@b.co', rol: 'Administrador' },
    } as any)
    const req = { body: { correo: 'a@b.co', password: 'secret' } } as Request
    const res = responseMock()
    await authController.login(req, res, vi.fn() as NextFunction)

    expect(res.cookie).toHaveBeenCalledWith(REFRESH_COOKIE, 'refresh-secret', expect.objectContaining({ httpOnly: true }))
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'access', csrfToken: expect.any(String) }))
    expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({ refreshToken: expect.anything() }))
  })

  it('refresh exige doble envÃ­o CSRF y lee el refresh desde cookie', async () => {
    const refresh = vi.spyOn(authService, 'refresh').mockResolvedValue({ token: 'next', refreshToken: 'next-refresh', usuario: {} } as any)
    const req = {
      body: { refreshToken: 'body-must-be-ignored' },
      cookies: { [REFRESH_COOKIE]: 'cookie-refresh', [CSRF_COOKIE]: 'csrf-value' },
      header: vi.fn((name: string) => name === CSRF_HEADER ? 'csrf-value' : undefined),
    } as unknown as Request
    await authController.refresh(req, responseMock(), vi.fn() as NextFunction)
    expect(refresh).toHaveBeenCalledWith('cookie-refresh')
  })
})
