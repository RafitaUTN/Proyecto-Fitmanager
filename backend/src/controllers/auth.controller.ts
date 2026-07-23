import type { Request, Response, NextFunction } from 'express'
import { loginSchema, refreshSchema } from '../dtos/auth.dto'
import { authService } from '../services/auth.service'

function handleError(error: any, res: Response, next: NextFunction) {
  if (error.name === 'ZodError') {
    res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    return
  }
  if (error.statusCode) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }
  next(error)
}

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = loginSchema.parse(req.body)
      const resultado = await authService.login(dto)
      res.json(resultado)
    } catch (error: any) {
      handleError(error, res, next)
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = refreshSchema.parse(req.body)
      const resultado = await authService.refresh(dto.refreshToken)
      res.json(resultado)
    } catch (error: any) {
      handleError(error, res, next)
    }
  },

  async logout(_req: Request, res: Response) {
    res.json({ ok: true })
  },
}
