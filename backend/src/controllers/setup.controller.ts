import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { setupPasswordSchema } from '../dtos/auth.dto'
import { tokenService } from '../services/token.service'
import { prisma } from '../lib/prisma'

export const setupController = {
  async verificarToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query as { token?: string }
      if (!token) {
        res.status(400).json({ error: 'Token requerido' })
        return
      }
      await tokenService.usarToken(token, 'ACTIVACION')
      res.json({ valido: true })
    } catch (error: any) {
      if (error.codigo) {
        res.status(400).json({ error: error.message, codigo: error.codigo })
        return
      }
      next(error)
    }
  },

  async setupPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = setupPasswordSchema.parse(req.body)
      const { id_cliente } = await tokenService.usarToken(dto.token, 'ACTIVACION')

      const hash = await bcrypt.hash(dto.password, 10)
      await prisma.cliente.update({
        where: { id_cliente },
        data: { contrasena: hash },
      })

      res.json({ mensaje: 'Contraseña creada exitosamente. Ya puedes iniciar sesión.' })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
        return
      }
      if (error.codigo) {
        res.status(400).json({ error: error.message, codigo: error.codigo })
        return
      }
      next(error)
    }
  },
}
