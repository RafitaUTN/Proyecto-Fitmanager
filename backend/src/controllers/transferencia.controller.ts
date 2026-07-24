import type { Request, Response, NextFunction } from 'express'
import { crearSolicitudSchema, responderSolicitudSchema } from '../dtos/transferencia.dto'
import { transferenciaService } from '../services/transferencia.service'
import { safeBigInt } from '../lib/bigint'

export const transferenciaController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const estado = req.query.estado as string | undefined
      const rol = req.query.rol as string | undefined
      const solicitudes = await transferenciaService.listar(idGimnasio, estado, rol)
      res.json(solicitudes)
    } catch (error) { next(error) }
  },

  async buscar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de solicitud')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const solicitud = await transferenciaService.buscar(id, idGimnasio)
      res.json(solicitud)
    } catch (error) { next(error) }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearSolicitudSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idUsuario = req.usuario.id_usuario
      const ip = req.ip
      const solicitud = await transferenciaService.crear(idGimnasio, dto, idUsuario, ip)
      res.status(201).json(solicitud)
    } catch (error) { next(error) }
  },

  async aprobar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = responderSolicitudSchema.parse(req.body)
      const id = safeBigInt(req.params.id, 'id de solicitud')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idUsuario = req.usuario.id_usuario
      const ip = req.ip
      const result = await transferenciaService.aprobar(id, idGimnasio, idUsuario, dto.observaciones, ip)
      res.json(result)
    } catch (error) { next(error) }
  },

  async rechazar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = responderSolicitudSchema.parse(req.body)
      const id = safeBigInt(req.params.id, 'id de solicitud')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idUsuario = req.usuario.id_usuario
      const ip = req.ip
      const result = await transferenciaService.rechazar(id, idGimnasio, idUsuario, dto.observaciones, ip)
      res.json(result)
    } catch (error) { next(error) }
  },

  async cancelar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de solicitud')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idUsuario = req.usuario.id_usuario
      const ip = req.ip
      const result = await transferenciaService.cancelar(id, idGimnasio, idUsuario, ip)
      res.json(result)
    } catch (error) { next(error) }
  },

  async indicadores(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const data = await transferenciaService.indicadores(idGimnasio)
      res.json(data)
    } catch (error) { next(error) }
  },
}
