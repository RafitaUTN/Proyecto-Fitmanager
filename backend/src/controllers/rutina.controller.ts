import type { Request, Response, NextFunction } from 'express'
import {
  crearRutinaSchema,
  actualizarRutinaSchema,
  asignarRutinaSchema,
  asignarEntrenadorSchema,
  actualizarEjercicioClienteSchema,
  actualizarClienteRutinaSchema,
} from '../dtos/rutina.dto'
import { rutinaService } from '../services/rutina.service'
import { safeBigInt } from '../lib/bigint'

export const rutinaController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const rutinas = await rutinaService.listar(req.context)
      res.json(rutinas)
    } catch (error) { next(error) }
  },

  async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id)
      const rutina = await rutinaService.obtener(id, req.context)
      res.json(rutina)
    } catch (error) { next(error) }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearRutinaSchema.parse(req.body)
      const rutina = await rutinaService.crear(req.context, dto)
      res.status(201).json(rutina)
    } catch (error) { next(error) }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = actualizarRutinaSchema.parse(req.body)
      const id = safeBigInt(req.params.id)
      const rutina = await rutinaService.actualizar(id, req.context, dto)
      res.json(rutina)
    } catch (error) { next(error) }
  },

  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id)
      await rutinaService.eliminar(id, req.context)
      res.json({ mensaje: 'Rutina eliminada' })
    } catch (error) { next(error) }
  },

  async asignarEntrenador(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = asignarEntrenadorSchema.parse(req.body)
      const idRutina = safeBigInt(req.params.id)
      const idEntrenador = safeBigInt(dto.id_entrenador)
      await rutinaService.asignarEntrenador(idRutina, req.context, idEntrenador)
      res.status(201).json({ mensaje: 'Rutina asignada al entrenador' })
    } catch (error) { next(error) }
  },

  async removerEntrenador(req: Request, res: Response, next: NextFunction) {
    try {
      const idRutina = safeBigInt(req.params.id)
      const idEntrenador = safeBigInt(req.params.idEntrenador)
      await rutinaService.removerEntrenador(idRutina, req.context, idEntrenador)
      res.json({ mensaje: 'Entrenador removido de la rutina' })
    } catch (error) { next(error) }
  },

  async listarEntrenadoresAsignados(req: Request, res: Response, next: NextFunction) {
    try {
      const idRutina = safeBigInt(req.params.id)
      const entrenadores = await rutinaService.listarEntrenadoresAsignados(idRutina, req.context)
      res.json(entrenadores)
    } catch (error) { next(error) }
  },

  async asignarCliente(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = asignarRutinaSchema.parse(req.body)
      const idRutina = safeBigInt(req.params.id)
      const asignacion = await rutinaService.asignarCliente(idRutina, req.context, dto)
      res.status(201).json(asignacion)
    } catch (error) { next(error) }
  },

  async listarAsignaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id)
      const asignaciones = await rutinaService.listarAsignaciones(id, req.context)
      res.json(asignaciones)
    } catch (error) { next(error) }
  },

  async obtenerClienteRutina(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.idClienteRutina)
      const cr = await rutinaService.obtenerClienteRutina(id, req.context)
      res.json(cr)
    } catch (error) { next(error) }
  },

  async actualizarEjercicioCliente(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.idEjercicio)
      const data = actualizarEjercicioClienteSchema.parse(req.body)
      const ejercicio = await rutinaService.actualizarEjercicioCliente(id, req.context, data)
      res.json(ejercicio)
    } catch (error) { next(error) }
  },

  async actualizarClienteRutina(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.idClienteRutina)
      const data = actualizarClienteRutinaSchema.parse(req.body)
      const cr = await rutinaService.actualizarClienteRutina(id, req.context, data)
      res.json(cr)
    } catch (error) { next(error) }
  },

  async listarRutinasDeCliente(req: Request, res: Response, next: NextFunction) {
    try {
      const idCliente = safeBigInt(req.params.idCliente)
      const rutinas = await rutinaService.listarRutinasDeCliente(idCliente, req.context)
      res.json(rutinas)
    } catch (error) { next(error) }
  },
}
