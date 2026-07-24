import type { Request, Response, NextFunction } from 'express'
import { crearMembresiaSchema, actualizarMembresiaSchema } from '../dtos/membresia.dto'
import { membresiaService } from '../services/membresia.service'
import { safeBigInt } from '../lib/bigint'

export const membresiaController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const membresias = await membresiaService.listar(idGimnasio)
      res.json(membresias)
    } catch (error) { next(error) }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearMembresiaSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const membresia = await membresiaService.crear(idGimnasio, dto)
      res.status(201).json({ id_membresia: membresia.id_membresia })
    } catch (error) { next(error) }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = actualizarMembresiaSchema.parse(req.body)
      const id = safeBigInt(req.params.id, 'id de membresía')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const membresia = await membresiaService.actualizar(id, dto, idGimnasio)
      res.json(membresia)
    } catch (error) { next(error) }
  },

  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de membresía')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      await membresiaService.eliminar(id, idGimnasio)
      res.json({ ok: true })
    } catch (error) { next(error) }
  },
}
