import type { Request, Response, NextFunction } from 'express'
import { notificacionService } from '../services/notificacion.service'
import { safeBigInt } from '../lib/bigint'
import { emailService } from '../email/email.service'
import { listarNotificacionesQuery } from '../dtos/notificacion.dto'

export const notificacionController = {
  async reenviarCorreos(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await emailService.reenviarPendientes())
    } catch (error) { next(error) }
  },

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const { tipo } = listarNotificacionesQuery.parse(req.query)
      const rol = req.usuario.rol
      const idUsuario = req.usuario.id_usuario
      const notificaciones = await notificacionService.listar(idGimnasio, tipo, rol, idUsuario)
      res.json(notificaciones)
    } catch (error) { next(error) }
  },

  async contarNoLeidas(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const total = await notificacionService.contarNoLeidas(idGimnasio, req.usuario.rol, req.usuario.id_usuario)
      res.json({ total })
    } catch (error) { next(error) }
  },

  async generarAlertas(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const result = await notificacionService.generarAlertas(idGimnasio)
      res.json(result)
    } catch (error) { next(error) }
  },

  async marcarLeida(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de notificación')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      await notificacionService.marcarLeida(id, idGimnasio, req.usuario.rol, req.usuario.id_usuario)
      res.json({ ok: true })
    } catch (error) { next(error) }
  },
}
