import type { Request, Response, NextFunction } from 'express'
import { crearEjercicioSchema, actualizarEjercicioSchema } from '../dtos/ejercicio.dto'
import { ejercicioService } from '../services/ejercicio.service'
import { safeBigInt } from '../lib/bigint'

export const ejercicioController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const ejercicios = await ejercicioService.listar(idGimnasio)
      res.json(ejercicios)
    } catch (error) { next(error) }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearEjercicioSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const ejercicio = await ejercicioService.crear(idGimnasio, dto)
      res.status(201).json(ejercicio)
    } catch (error) { next(error) }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = actualizarEjercicioSchema.parse(req.body)
      const id = safeBigInt(req.params.id)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const ejercicio = await ejercicioService.actualizar(id, idGimnasio, dto)
      res.json(ejercicio)
    } catch (error) { next(error) }
  },

  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      await ejercicioService.eliminar(id, idGimnasio)
      res.json({ mensaje: 'Ejercicio eliminado' })
    } catch (error) { next(error) }
  },
}
