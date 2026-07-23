import type { Request, Response, NextFunction } from 'express'
import { notificacionService } from '../services/notificacion.service'

export const notificacionController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt(req.usuario.id_gimnasio)
      const tipo = req.query.tipo as string | undefined
      const notificaciones = await notificacionService.listar(idGimnasio, tipo)
      res.json(notificaciones)
    } catch (error) { next(error) }
  },

  async contarNoLeidas(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt(req.usuario.id_gimnasio)
      const total = await notificacionService.contarNoLeidas(idGimnasio)
      res.json({ total })
    } catch (error) { next(error) }
  },

  async generarAlertas(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt(req.usuario.id_gimnasio)
      const result = await notificacionService.generarAlertas(idGimnasio)
      res.json(result)
    } catch (error) { next(error) }
  },

  async marcarLeida(req: Request, res: Response, next: NextFunction) {
    try {
      const id = BigInt(req.params.id as string)
      const idGimnasio = BigInt(req.usuario.id_gimnasio)
      await notificacionService.marcarLeida(id, idGimnasio)
      res.json({ ok: true })
    } catch (error) { next(error) }
  },
}
