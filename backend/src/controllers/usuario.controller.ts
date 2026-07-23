import type { Request, Response, NextFunction } from 'express'
import { crearUsuarioSchema, actualizarUsuarioSchema } from '../dtos/usuario.dto'
import { usuarioService } from '../services/usuario.service'

export const usuarioController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt(req.usuario.id_gimnasio)
      const usuarios = await usuarioService.listar(idGimnasio)
      res.json(usuarios)
    } catch (error) { next(error) }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearUsuarioSchema.parse(req.body)
      const idGimnasio = BigInt(req.usuario.id_gimnasio)
      const usuario = await usuarioService.crear(idGimnasio, dto)
      res.status(201).json({ id_usuario: usuario.id_usuario })
    } catch (error) { next(error) }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = actualizarUsuarioSchema.parse(req.body)
      const id = BigInt(req.params.id as string)
      const idGimnasio = BigInt(req.usuario.id_gimnasio)
      const usuario = await usuarioService.actualizar(id, dto, idGimnasio)
      res.json(usuario)
    } catch (error) { next(error) }
  },

  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = BigInt(req.params.id as string)
      const idGimnasio = BigInt(req.usuario.id_gimnasio)
      await usuarioService.eliminar(id, idGimnasio)
      res.json({ ok: true })
    } catch (error) { next(error) }
  },
}
