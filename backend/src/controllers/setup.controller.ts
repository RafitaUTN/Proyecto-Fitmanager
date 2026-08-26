/**
 * Controlador HTTP del módulo setup.controller.
 *
 * @remarks Recibe la petición Express, valida parámetros básicos y delega reglas de negocio a servicios especializados.
 */
import type { Request, Response, NextFunction } from 'express'
import { restablecerPasswordSchema, setupPasswordSchema, solicitarRecuperacionSchema } from '../dtos/auth.dto'
import { tokenService } from '../services/token.service'
import { passwordRecoveryService } from '../services/password-recovery.service'
import { setupService } from '../services/setup.service'

export const setupController = {
  async solicitarRecuperacion(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = solicitarRecuperacionSchema.parse(req.body)
      res.json(await passwordRecoveryService.solicitar(dto.correo))
    } catch (error) {
      next(error)
    }
  },

  async restablecerPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = restablecerPasswordSchema.parse(req.body)
      res.json(await passwordRecoveryService.restablecer(dto.token, dto.password))
    } catch (error) {
      next(error)
    }
  },

  async verificarToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query as { token?: string }
      if (!token) return void res.status(400).json({ error: 'Token requerido' })
      await tokenService.validarToken(token, 'ACTIVACION')
      res.json({ valido: true })
    } catch (error) {
      next(error)
    }
  },

  async setupPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = setupPasswordSchema.parse(req.body)
      res.json(await setupService.activarPasswordCliente(dto.token, dto.password))
    } catch (error) {
      next(error)
    }
  },
}
