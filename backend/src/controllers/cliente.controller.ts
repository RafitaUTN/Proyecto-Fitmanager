import type { Request, Response, NextFunction } from 'express'
import { crearClienteSchema, actualizarClienteSchema } from '../dtos/cliente.dto'
import { clienteService } from '../services/cliente.service'
import { clienteMembresiaService } from '../services/cliente-membresia.service'
import { safeBigInt } from '../lib/bigint'

export const clienteController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { gymId: idGimnasio, actorId, role } = req.context
      const cedula = req.query.cedula as string | undefined
      const q = req.query.q as string | undefined
      const idEntrenador = req.query.id_entrenador as string | undefined
      if (role === 'Entrenador') {
        if (idEntrenador && safeBigInt(idEntrenador, 'id_entrenador') !== actorId) {
          res.status(403).json({ error: 'No puedes consultar clientes de otro entrenador' })
          return
        }
        if (cedula) {
          const cliente = await clienteService.buscarPorCedulaEntrenador(cedula, actorId, idGimnasio)
          res.json(cliente ? [cliente] : [])
          return
        }
        const clientes = q
          ? await clienteService.buscarPorNombreEntrenador(q, actorId, idGimnasio)
          : await clienteService.listarPorEntrenador(actorId, idGimnasio)
        res.json(clientes)
        return
      }
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

  async sugerencias(req: Request, res: Response, next: NextFunction) {
    try {
      const { gymId: idGimnasio, actorId, role } = req.context
      const idEntrenador = role === 'Entrenador' ? actorId : undefined
      const clientes = await clienteService.sugerencias(idGimnasio, idEntrenador)
      res.json(clientes)
    } catch (error) { next(error) }
  },

  async buscar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de cliente')
      const cliente = await clienteService.buscarParaActor(id, req.context)
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

  async perfil(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de cliente')
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const perfil = await clienteMembresiaService.consultarEstado(id, idGimnasio)
      res.json(perfil)
    } catch (error) { next(error) }
  },
}
