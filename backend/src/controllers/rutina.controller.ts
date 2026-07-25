import type { Request, Response, NextFunction } from 'express'
import { crearRutinaSchema, actualizarRutinaSchema, asignarRutinaSchema } from '../dtos/rutina.dto'
import { rutinaService } from '../services/rutina.service'
import { safeBigInt } from '../lib/bigint'

export const rutinaController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idEntrenador = req.usuario.rol === 'Entrenador' ? safeBigInt(req.usuario.id_usuario) : undefined
      const rutinas = await rutinaService.listar(idGimnasio, idEntrenador)
      res.json(rutinas)
    } catch (error) { next(error) }
  },

  async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const rutina = await rutinaService.obtener(id, idGimnasio)
      res.json(rutina)
    } catch (error) { next(error) }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearRutinaSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idUsuarioCreador = safeBigInt(req.usuario.id_usuario)
      const rutina = await rutinaService.crear(idGimnasio, idUsuarioCreador, dto)
      res.status(201).json(rutina)
    } catch (error) { next(error) }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = actualizarRutinaSchema.parse(req.body)
      const id = safeBigInt(req.params.id)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const rutina = await rutinaService.actualizar(id, idGimnasio, dto)
      res.json(rutina)
    } catch (error) { next(error) }
  },

  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      await rutinaService.eliminar(id, idGimnasio)
      res.json({ mensaje: 'Rutina eliminada' })
    } catch (error) { next(error) }
  },

  async asignarEntrenador(req: Request, res: Response, next: NextFunction) {
    try {
      const idRutina = safeBigInt(req.params.id)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idEntrenador = safeBigInt(req.body.id_entrenador)
      await rutinaService.asignarEntrenador(idRutina, idGimnasio, idEntrenador)
      res.status(201).json({ mensaje: 'Rutina asignada al entrenador' })
    } catch (error) { next(error) }
  },

  async removerEntrenador(req: Request, res: Response, next: NextFunction) {
    try {
      const idRutina = safeBigInt(req.params.id)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idEntrenador = safeBigInt(req.params.idEntrenador)
      await rutinaService.removerEntrenador(idRutina, idGimnasio, idEntrenador)
      res.json({ mensaje: 'Entrenador removido de la rutina' })
    } catch (error) { next(error) }
  },

  async listarEntrenadoresAsignados(req: Request, res: Response, next: NextFunction) {
    try {
      const idRutina = safeBigInt(req.params.id)
      const entrenadores = await rutinaService.listarEntrenadoresAsignados(idRutina)
      res.json(entrenadores)
    } catch (error) { next(error) }
  },

  async asignarCliente(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = asignarRutinaSchema.parse(req.body)
      const idRutina = safeBigInt(req.params.id)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idEntrenador = req.usuario.rol === 'Entrenador' ? safeBigInt(req.usuario.id_usuario) : undefined
      const asignacion = await rutinaService.asignarCliente(idRutina, idGimnasio, dto, idEntrenador)
      res.status(201).json(asignacion)
    } catch (error) { next(error) }
  },

  async listarAsignaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id)
      const asignaciones = await rutinaService.listarAsignaciones(id)
      res.json(asignaciones)
    } catch (error) { next(error) }
  },

  async obtenerClienteRutina(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.idClienteRutina)
      const cr = await rutinaService.obtenerClienteRutina(id)
      res.json(cr)
    } catch (error) { next(error) }
  },

  async actualizarEjercicioCliente(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.idEjercicio)
      const data = req.body
      const ejercicio = await rutinaService.actualizarEjercicioCliente(id, data)
      res.json(ejercicio)
    } catch (error) { next(error) }
  },

  async actualizarClienteRutina(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.idClienteRutina)
      const data = req.body
      const cr = await rutinaService.actualizarClienteRutina(id, data)
      res.json(cr)
    } catch (error) { next(error) }
  },

  async listarRutinasDeCliente(req: Request, res: Response, next: NextFunction) {
    try {
      const idCliente = safeBigInt(req.params.idCliente)
      const rutinas = await rutinaService.listarRutinasDeCliente(idCliente)
      res.json(rutinas)
    } catch (error) { next(error) }
  },
}
