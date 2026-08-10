import type { Request, Response, NextFunction } from 'express'
import { loginSchema } from '../dtos/auth.dto'
import { authService } from '../services/auth.service'
import { CSRF_COOKIE, establecerCsrf, establecerSesion, limpiarSesion, obtenerRefreshToken, validarCsrf } from '../lib/session-cookies'

function responderConSesion(res: Response, resultado: Record<string, any>, status = 200) {
  const { refreshToken, ...body } = resultado
  const csrfToken = establecerSesion(res, refreshToken)
  res.status(status).json({ ...body, csrfToken })
}

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = loginSchema.parse(req.body)
      const resultado = await authService.login(dto)
      responderConSesion(res, resultado)
    } catch (error: any) {
      if (error.codigo) {
        res.status(error.statusCode).json({ error: error.message, codigo: error.codigo })
        return
      }
      next(error)
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      validarCsrf(req)
      const resultado = await authService.refresh(obtenerRefreshToken(req))
      responderConSesion(res, resultado)
    } catch (error: any) {
      if (error.codigo) {
        res.status(error.statusCode).json({ error: error.message, codigo: error.codigo })
        return
      }
      next(error)
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      validarCsrf(req)
      await authService.logout(obtenerRefreshToken(req))
      limpiarSesion(res)
      res.json({ ok: true })
    } catch (error) { next(error) }
  },

  async health(_req: Request, res: Response) {
    res.json({ status: 'ok' })
  },

  csrf(req: Request, res: Response) {
    const csrfToken = establecerCsrf(res, req.cookies?.[CSRF_COOKIE])
    res.json({ csrfToken })
  },
}
