import type { Request, Response, NextFunction } from 'express'
import { loginSchema, refreshSchema } from '../dtos/auth.dto'
import { authService } from '../services/auth.service'

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = loginSchema.parse(req.body)
      const resultado = await authService.login(dto)
      res.json(resultado)
    } catch (error) { next(error) }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = refreshSchema.parse(req.body)
      const resultado = await authService.refresh(dto.refreshToken)
      res.json(resultado)
    } catch (error) { next(error) }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body?.refreshToken
      await authService.logout(refreshToken)
      res.json({ ok: true })
    } catch (error) { next(error) }
  },
}
