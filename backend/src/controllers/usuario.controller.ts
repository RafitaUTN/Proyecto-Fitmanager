/**
 * Controlador HTTP del módulo usuario.controller.
 *
 * @remarks Recibe la petición Express, valida parámetros básicos y delega reglas de negocio a servicios especializados.
 */
import type { Request, Response, NextFunction } from 'express'
import { crearUsuarioSchema, actualizarUsuarioSchema, cambiarPasswordUsuarioSchema } from '../dtos/usuario.dto'
import { usuarioService } from '../services/usuario.service'
import { safeBigInt } from '../lib/bigint'
import { hasPaginationQuery, paginatedResponse, paginationQuerySchema } from '../lib/pagination'

export const usuarioController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      if (hasPaginationQuery(req.query)) {
        const { page, pageSize, search } = paginationQuerySchema.parse(req.query)
        const result = await usuarioService.listarPaginado(idGimnasio, page, pageSize, search)
        res.json(paginatedResponse(result.data, page, pageSize, result.totalItems))
        return
      }
      const usuarios = await usuarioService.listar(idGimnasio)
      res.json(usuarios)
    } catch (error) {
      next(error)
    }
  },

  async perfil(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.usuario.id_usuario)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      res.json(await usuarioService.perfil(id, idGimnasio))
    } catch (error) {
      next(error)
    }
  },

  async cambiarPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = cambiarPasswordUsuarioSchema.parse(req.body)
      const id = safeBigInt(req.usuario.id_usuario)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      await usuarioService.cambiarPassword(id, idGimnasio, dto.contrasena_actual, dto.contrasena_nueva)
      res.json({ mensaje: 'Contraseña actualizada correctamente.' })
    } catch (error: any) {
      if (error.codigo) {
        res.status(error.statusCode || 400).json({ error: error.message, codigo: error.codigo })
        return
      }
      next(error)
    }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearUsuarioSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const usuario = await usuarioService.crear(idGimnasio, dto)
      res.status(201).json({ id_usuario: usuario.id_usuario })
    } catch (error) {
      next(error)
    }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = actualizarUsuarioSchema.parse(req.body)
      const id = safeBigInt(req.params.id, 'id de usuario')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idAutenticado = safeBigInt(req.usuario.id_usuario)
      const usuario = await usuarioService.actualizar(id, dto, idGimnasio, idAutenticado)
      res.json(usuario)
    } catch (error) {
      next(error)
    }
  },

  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de usuario')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idAutenticado = safeBigInt(req.usuario.id_usuario)
      await usuarioService.eliminar(id, idGimnasio, idAutenticado)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  },
}
