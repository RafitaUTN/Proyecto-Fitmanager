import type { Request, Response, NextFunction } from 'express'
import { loginSchema } from '../dtos/auth.dto'
import { authService } from '../services/auth.service'

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = loginSchema.parse(req.body)
      const resultado = await authService.login(dto)
      res.json(resultado)
    } catch (error: any) {
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
  },
}
