import type { Request, Response, NextFunction } from 'express'
import { crearUsuarioSchema, actualizarUsuarioSchema } from '../dtos/usuario.dto'
import { usuarioService } from '../services/usuario.service'

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

export const usuarioController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const usuarios = await usuarioService.listar(idGimnasio)
      res.json(usuarios)
    } catch (error) { next(error) }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearUsuarioSchema.parse(req.body)
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const usuario = await usuarioService.crear(idGimnasio, dto)
      res.status(201).json({ id_usuario: usuario.id_usuario })
    } catch (error) { handleError(res, error, next) }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = actualizarUsuarioSchema.parse(req.body)
      const id = BigInt(req.params.id as string)
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const usuario = await usuarioService.actualizar(id, dto, idGimnasio)
      res.json(usuario)
    } catch (error) { handleError(res, error, next) }
  },

  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = BigInt(req.params.id as string)
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      await usuarioService.eliminar(id, idGimnasio)
      res.json({ ok: true })
    } catch (error) { handleError(res, error, next) }
  },
}
