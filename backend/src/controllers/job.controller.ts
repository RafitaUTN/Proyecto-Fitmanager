/**
 * Controlador HTTP del módulo job.controller.
 *
 * @remarks Recibe la petición Express, valida parámetros básicos y delega reglas de negocio a servicios especializados.
 */
import type { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'
import { notificacionService } from '../services/notificacion.service'

export const jobController = {
  async paymentWindow(req: Request, res: Response, next: NextFunction) {
    try {
      if (!env.cronSecret || req.header('authorization') !== `Bearer ${env.cronSecret}`) {
        res.status(401).json({ error: 'No autorizado', codigo: 'CRON_UNAUTHORIZED' })
        return
      }
      res.json(await notificacionService.generarAlertasTodosGimnasios())
    } catch (error) {
      next(error)
    }
  },
}
