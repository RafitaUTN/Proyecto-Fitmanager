/**
 * Controlador HTTP del módulo dashboard.controller.
 *
 * @remarks Recibe la petición Express, valida parámetros básicos y delega reglas de negocio a servicios especializados.
 */
import type { Request, Response, NextFunction } from 'express'
import { safeBigInt } from '../lib/bigint'
import { dashboardService } from '../services/dashboard.service'

export const dashboardController = {
  async indicadores(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      res.json(await dashboardService.obtenerIndicadores(idGimnasio, req.usuario.rol, req.usuario.id_usuario))
    } catch (error) {
      next(error)
    }
  },
}
