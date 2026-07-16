import type { Request, Response, NextFunction } from 'express'
import { crearMembresiaSchema, actualizarMembresiaSchema } from '../dtos/membresia.dto'
import { membresiaService } from '../services/membresia.service'

function handleError(res: Response, error: any, next: NextFunction) {
  if (error.name === 'ZodError') {
    res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
    return
  }
  if (error.statusCode) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }
  next(error)
}

export const membresiaController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const membresias = await membresiaService.listar(idGimnasio)
      res.json(membresias)
    } catch (error) { next(error) }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearMembresiaSchema.parse(req.body)
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const membresia = await membresiaService.crear(idGimnasio, dto)
      res.status(201).json({ id_membresia: membresia.id_membresia })
    } catch (error) { handleError(res, error, next) }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = actualizarMembresiaSchema.parse(req.body)
      const id = BigInt(req.params.id as string)
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const membresia = await membresiaService.actualizar(id, dto, idGimnasio)
      res.json(membresia)
    } catch (error) { handleError(res, error, next) }
  },
}
