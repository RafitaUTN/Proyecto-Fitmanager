import type { Request, Response, NextFunction } from 'express'
import { registrarEntradaSchema, registrarSalidaSchema, listarAsistenciasSchema } from '../dtos/asistencia.dto'
import { asistenciaService } from '../services/asistencia.service'
import { safeBigInt } from '../lib/bigint'

export const asistenciaController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const filtros = listarAsistenciasSchema.parse(req.query)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idEntrenador = req.usuario.rol === 'Entrenador' ? safeBigInt(req.usuario.id_usuario) : undefined
      const resultado = await asistenciaService.listar(idGimnasio, filtros, idEntrenador)
      res.json(resultado)
    } catch (error) { next(error) }
  },

  async listarHoy(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const asistencias = await asistenciaService.listarHoy(idGimnasio)
      res.json(asistencias)
    } catch (error) { next(error) }
  },

  async registrarEntrada(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = registrarEntradaSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const asistencia = await asistenciaService.registrarEntrada(idGimnasio, dto)
      res.status(201).json(asistencia)
    } catch (error) { next(error) }
  },

  async registrarSalida(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = registrarSalidaSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const asistencia = await asistenciaService.registrarSalida(idGimnasio, dto)
      res.json(asistencia)
    } catch (error) { next(error) }
  },
}
