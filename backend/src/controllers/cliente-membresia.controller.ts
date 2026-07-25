import type { Request, Response, NextFunction } from 'express'
import { asignarMembresiaSchema, cambiarPlanSchema } from '../dtos/cliente-membresia.dto'
import { clienteMembresiaService } from '../services/cliente-membresia.service'
import { safeBigInt } from '../lib/bigint'

export const clienteMembresiaController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idCliente = req.query.id_cliente
      const recientes = req.query.recientes === 'true'
      if (recientes) {
        const data = await clienteMembresiaService.listarRecientes(idGimnasio)
        res.json(data)
        return
      }
      const data = idCliente
        ? await clienteMembresiaService.listarPorCliente(safeBigInt(idCliente, 'id_cliente'), idGimnasio)
        : await clienteMembresiaService.listarTodas(idGimnasio)
      res.json(data)
    } catch (error) { next(error) }
  },

  async asignar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = asignarMembresiaSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const result = await clienteMembresiaService.asignar(idGimnasio, dto)
      res.status(201).json({ id_cliente_membresia: result.id_cliente_membresia })
    } catch (error) { next(error) }
  },

  async cancelar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const id = safeBigInt(req.params.id, 'id de cliente-membresía')
      await clienteMembresiaService.cancelar(id, idGimnasio)
      res.json({ ok: true })
    } catch (error) { next(error) }
  },

  async consultarEstado(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idCliente = safeBigInt(req.params.id, 'id de cliente')
      const estado = await clienteMembresiaService.consultarEstado(idCliente, idGimnasio)
      res.json(estado)
    } catch (error) { next(error) }
  },

  async renovar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const id = safeBigInt(req.params.id, 'id de cliente-membresía')
      const result = await clienteMembresiaService.renovar(id, idGimnasio)
      res.status(201).json({ id_cliente_membresia: result.id_cliente_membresia })
    } catch (error) { next(error) }
  },

  async cambiarPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = cambiarPlanSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idCliente = safeBigInt(dto.id_cliente)
      const result = await clienteMembresiaService.cambiarPlan(idCliente, idGimnasio, {
        id_membresia: safeBigInt(dto.id_membresia),
        fecha_inicio: dto.fecha_inicio,
      })
      res.json({ id_cliente_membresia: result.id_cliente_membresia })
    } catch (error) { next(error) }
  },
}
