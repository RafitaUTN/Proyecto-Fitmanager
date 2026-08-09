import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { CookieOptions, Request, Response } from 'express'
import { env } from '../config/env'
import { AppError } from './errors'

export const REFRESH_COOKIE = 'fitmanager_refresh'
export const CSRF_COOKIE = 'fitmanager_csrf'
export const CSRF_HEADER = 'x-csrf-token'

const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function baseCookieOptions(): CookieOptions {
  return {
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    maxAge: REFRESH_MAX_AGE_MS,
  }
}

export function crearCsrfToken(): string {
  return randomBytes(32).toString('base64url')
}

export function establecerSesion(res: Response, refreshToken: string): string {
  const csrfToken = crearCsrfToken()
  const base = baseCookieOptions()
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...base,
    httpOnly: true,
    path: '/api/auth',
  })
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...base,
    httpOnly: false,
    path: '/',
  })
  res.setHeader('Cache-Control', 'no-store')
  return csrfToken
}

export function establecerCsrf(res: Response, csrfActual?: string): string {
  const csrfToken = typeof csrfActual === 'string' && csrfActual.length >= 32 ? csrfActual : crearCsrfToken()
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...baseCookieOptions(),
    httpOnly: false,
    path: '/',
  })
  res.setHeader('Cache-Control', 'no-store')
  return csrfToken
}

export function limpiarSesion(res: Response): void {
  const base = baseCookieOptions()
  res.clearCookie(REFRESH_COOKIE, { ...base, httpOnly: true, path: '/api/auth' })
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false, path: '/' })
  res.setHeader('Cache-Control', 'no-store')
}

export function obtenerRefreshToken(req: Request): string {
  const token = req.cookies?.[REFRESH_COOKIE]
  if (typeof token !== 'string' || token.length === 0) {
    throw new AppError('SesiÃ³n no disponible', 401, 'REFRESH_AUSENTE')
  }
  return token
}

export function validarCsrf(req: Request): void {
  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.header(CSRF_HEADER)
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    throw new AppError('Token CSRF invÃ¡lido', 403, 'CSRF_INVALIDO')
  }
  const cookieBuffer = Buffer.from(cookieToken)
  const headerBuffer = Buffer.from(headerToken)
  if (cookieBuffer.length !== headerBuffer.length || !timingSafeEqual(cookieBuffer, headerBuffer)) {
    throw new AppError('Token CSRF invÃ¡lido', 403, 'CSRF_INVALIDO')
  }
}
