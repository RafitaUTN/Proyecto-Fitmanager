/**
 * Controlador HTTP del módulo entrenador.controller.
 *
 * @remarks Recibe la petición Express, valida parámetros básicos y delega reglas de negocio a servicios especializados.
 */
import type { Request, Response, NextFunction } from 'express'
import { safeBigInt } from '../lib/bigint'
import { entrenadorService } from '../services/entrenador.service'

export const entrenadorController = {
  async disponibles(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      res.json(await entrenadorService.listarDisponibles(idGimnasio))
    } catch (error) {
      next(error)
    }
  },
}
