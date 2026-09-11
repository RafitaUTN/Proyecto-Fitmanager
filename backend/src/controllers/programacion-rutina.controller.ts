/**
 * Controlador HTTP de programación de rutinas.
 *
 * @remarks Recibe filtros/DTOs, delega reglas al service y conserva el formato
 * de respuestas existente en FitManager.
 */
import type { Request, Response, NextFunction } from 'express'
import { safeBigInt } from '../lib/bigint'
import {
  actualizarProgramacionRutinaSchema,
  cancelarProgramacionRutinaSchema,
  crearProgramacionRutinaSchema,
  listarProgramacionesRutinaSchema,
} from '../dtos/programacion-rutina.dto'
import { programacionRutinaService } from '../services/programacion-rutina.service'

export const programacionRutinaController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const filtros = listarProgramacionesRutinaSchema.parse(req.query)
      res.json(await programacionRutinaService.listar(req.context, filtros))
    } catch (error) {
      next(error)
    }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearProgramacionRutinaSchema.parse(req.body)
      res.status(201).json(await programacionRutinaService.crear(req.context, dto))
    } catch (error) {
      next(error)
    }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de programación')
      const dto = actualizarProgramacionRutinaSchema.parse(req.body)
      res.json(await programacionRutinaService.actualizar(id, req.context, dto))
    } catch (error) {
      next(error)
    }
  },

  async cancelar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de programación')
      const dto = cancelarProgramacionRutinaSchema.parse(req.body)
      res.json(await programacionRutinaService.cancelar(id, req.context, dto.motivo))
    } catch (error) {
      next(error)
    }
  },
}
