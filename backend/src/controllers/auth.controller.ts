import type { Request, Response, NextFunction } from 'express'
import { loginSchema, refreshSchema, loginClienteSchema } from '../dtos/auth.dto'
import { authService } from '../services/auth.service'
import { clienteAuthService } from '../services/cliente-auth.service'

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = loginSchema.parse(req.body)
      const resultado = await authService.login(dto)
      res.json(resultado)
    } catch (error: any) {
      if (error.codigo) {
        res.status(error.statusCode).json({ error: error.message, codigo: error.codigo })
        return
      }
      next(error)
    }
  },

  async loginCliente(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = loginClienteSchema.parse(req.body)
      const resultado = await clienteAuthService.login(dto)
      res.json(resultado)
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
      const dto = refreshSchema.parse(req.body)
      const resultado = await authService.refresh(dto.refreshToken)
      res.json(resultado)
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
      const dto = refreshSchema.parse(req.body)
      await authService.logout(dto.refreshToken)
      res.json({ ok: true })
    } catch (error) { next(error) }
  },

  async health(_req: Request, res: Response) {
    res.json({ status: 'ok' })
  },
}
