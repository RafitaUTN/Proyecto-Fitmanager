import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { restablecerPasswordSchema, setupPasswordSchema, solicitarRecuperacionSchema } from '../dtos/auth.dto'
import { tokenService } from '../services/token.service'
import { passwordRecoveryService } from '../services/password-recovery.service'
import { prisma } from '../lib/prisma'
import { hashToken } from '../lib/token-hash'
import { AppError } from '../lib/errors'

export const setupController = {
  async solicitarRecuperacion(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = solicitarRecuperacionSchema.parse(req.body)
      res.json(await passwordRecoveryService.solicitar(dto.correo))
    } catch (error) { next(error) }
  },

  async restablecerPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = restablecerPasswordSchema.parse(req.body)
      res.json(await passwordRecoveryService.restablecer(dto.token, dto.password))
    } catch (error) { next(error) }
  },

  async verificarToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query as { token?: string }
      if (!token) return void res.status(400).json({ error: 'Token requerido' })
      await tokenService.validarToken(token, 'ACTIVACION')
      res.json({ valido: true })
    } catch (error) { next(error) }
  },

  async setupPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = setupPasswordSchema.parse(req.body)
      const passwordHash = await bcrypt.hash(dto.password, 12)
      const tokenHash = hashToken(dto.token)
      await prisma.$transaction(async (tx) => {
        const record = await tx.token.findUnique({ where: { token_hash: tokenHash } })
        if (!record || record.tipo !== 'ACTIVACION' || record.usado_en || record.expira_en < new Date()) {
          throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
        }
        const consumed = await tx.token.updateMany({
          where: { id: record.id, tipo: 'ACTIVACION', usado_en: null, expira_en: { gt: new Date() } },
          data: { usado_en: new Date() },
        })
        if (consumed.count !== 1) throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
        await tx.cliente.update({ where: { id_cliente: record.id_cliente }, data: { contrasena: passwordHash, contrasena_temporal: false } })
      })
      res.json({ mensaje: 'Contraseña creada exitosamente. Ya puedes iniciar sesión.' })
    } catch (error) { next(error) }
  },
}
