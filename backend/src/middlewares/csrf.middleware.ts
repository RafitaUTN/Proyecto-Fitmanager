import type { NextFunction, Request, Response } from 'express'
import { validarCsrfTokens } from '../lib/session-cookies'

/**
 * Rutas anónimas autenticadas por un token de acción de alta entropía
 * (setup-password, reset/forgot-password) o por registro público (gimnasios).
 *
 * Justificación del exemption de CSRF:
 * - No hay sesión (ni cookie de refresh ni token bearer) sobre la que un ataque
 *   CSRF pueda cabalgar: el POST solo tiene efecto si el atacante conoce el token
 *   de acción de un solo uso, y en ese caso CSRF no añade protección.
 * - Una cookie `fitmanager_refresh` obsoleta/ajena (máquina compartida, sesión
 *   antigua) hacía que estos flujos anónimos devolvieran 403 CSRF_INVALIDO.
 */
export const RUTAS_ACCION_ANONIMAS = new Set<string>([
  '/api/auth/setup-password',
  '/api/auth/reset-password',
  '/api/auth/forgot-password',
  '/api/gimnasios',
])

export function csrfMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const metodoSeguro = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
  const esAnonima = RUTAS_ACCION_ANONIMAS.has(req.path)

  if (metodoSeguro || esAnonima) {
    next()
    return
  }

  // El doble envío solo se exige cuando existe una sesión (cookie de refresh).
  const refreshToken = req.cookies?.fitmanager_refresh
  if (typeof refreshToken === 'string' && refreshToken.length > 0) {
    validarCsrfTokens(req.cookies?.fitmanager_csrf, req.header('x-csrf-token'))
  }

  next()
}
