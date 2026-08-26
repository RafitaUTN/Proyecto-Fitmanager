/**
 * Controlador HTTP del módulo asistencia.controller.
 *
 * @remarks Recibe la petición Express, valida parámetros básicos y delega reglas de negocio a servicios especializados.
 */
import type { Request, Response, NextFunction } from 'express'
import { registrarEntradaSchema, registrarSalidaSchema, listarAsistenciasSchema } from '../dtos/asistencia.dto'
import { asistenciaService } from '../services/asistencia.service'
import { safeBigInt } from '../lib/bigint'
import { hasPaginationQuery, paginatedResponse, paginationQuerySchema } from '../lib/pagination'

export const asistenciaController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const filtros = listarAsistenciasSchema.parse({
        ...req.query,
        pagina: req.query.page ?? req.query.pagina,
        limite: req.query.pageSize ?? req.query.limite,
      })
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idEntrenador = req.usuario.rol === 'Entrenador' ? safeBigInt(req.usuario.id_usuario) : undefined
      const resultado = await asistenciaService.listar(idGimnasio, filtros, idEntrenador)
      if (hasPaginationQuery(req.query)) {
        const { page, pageSize } = paginationQuerySchema.parse(req.query)
        res.json(paginatedResponse(resultado.data, page, pageSize, resultado.total))
        return
      }
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

  async listarActivas(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      res.json(await asistenciaService.listarActivas(idGimnasio))
    } catch (error) { next(error) }
  },

  async listarElegibles(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      res.json(await asistenciaService.listarElegibles(idGimnasio))
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
      const dto = registrarSalidaSchema.parse({ id_asistencia: req.params.id ?? req.body.id_asistencia })
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const asistencia = await asistenciaService.registrarSalida(idGimnasio, dto)
      res.json(asistencia)
    } catch (error) { next(error) }
  },
}
