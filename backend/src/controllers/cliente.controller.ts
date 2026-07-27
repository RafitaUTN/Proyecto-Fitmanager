import type { Request, Response, NextFunction } from 'express'
import { crearClienteSchema, actualizarClienteSchema } from '../dtos/cliente.dto'
import { clienteService } from '../services/cliente.service'
import { safeBigInt } from '../lib/bigint'

export const clienteController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const cedula = req.query.cedula as string | undefined
      const q = req.query.q as string | undefined
      const idEntrenador = req.query.id_entrenador as string | undefined
      if (cedula) {
        const cliente = await clienteService.buscarPorCedula(cedula, idGimnasio)
        res.json(cliente ? [cliente] : [])
        return
      }
      if (idEntrenador && q) {
        const clientes = await clienteService.buscarPorNombreEntrenador(q, safeBigInt(idEntrenador, 'id_entrenador'), idGimnasio)
        res.json(clientes)
        return
      }
      if (idEntrenador) {
        const clientes = await clienteService.listarPorEntrenador(safeBigInt(idEntrenador, 'id_entrenador'), idGimnasio)
        res.json(clientes)
        return
      }
      if (q) {
        const clientes = await clienteService.buscarPorNombre(q, idGimnasio)
        res.json(clientes)
        return
      }
      const clientes = await clienteService.listar(idGimnasio)
      res.json(clientes)
    } catch (error) { next(error) }
  },

  async buscar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de cliente')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const cliente = await clienteService.buscar(id, idGimnasio)
      res.json(cliente)
    } catch (error) { next(error) }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearClienteSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idEntrenador = req.usuario.rol === 'Entrenador' ? safeBigInt(req.usuario.id_usuario) : undefined
      const cliente = await clienteService.crear(idGimnasio, dto, idEntrenador)
      res.status(201).json({ id_cliente: cliente.id_cliente })
    } catch (error) { next(error) }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = actualizarClienteSchema.parse(req.body)
      const id = safeBigInt(req.params.id, 'id de cliente')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idUsuario = safeBigInt(req.usuario.id_usuario)
      const cliente = await clienteService.actualizar(id, dto, idGimnasio, idUsuario)
      res.json(cliente)
    } catch (error) { next(error) }
  },

  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de cliente')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      await clienteService.eliminar(id, idGimnasio)
      res.json({ ok: true })
    } catch (error) { next(error) }
  },
}
