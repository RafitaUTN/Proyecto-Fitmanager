import type { Request, Response, NextFunction } from 'express'
import { asignarMembresiaSchema } from '../dtos/cliente-membresia.dto'
import { clienteMembresiaService } from '../services/cliente-membresia.service'

export const clienteMembresiaController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const idCliente = req.query.id_cliente
      const data = idCliente
        ? await clienteMembresiaService.listarPorCliente(BigInt(idCliente as string), idGimnasio)
        : await clienteMembresiaService.listarTodas(idGimnasio)
      res.json(data)
    } catch (error) { next(error) }
  },

  async asignar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = asignarMembresiaSchema.parse(req.body)
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const result = await clienteMembresiaService.asignar(idGimnasio, dto)
      res.status(201).json({ id_cliente_membresia: result.id_cliente_membresia })
    } catch (error: any) {
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
  },

  async cancelar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const id = BigInt(req.params.id as string)
      await clienteMembresiaService.cancelar(id, idGimnasio)
      res.json({ ok: true })
    } catch (error: any) {
      if (error.statusCode) { res.status(error.statusCode).json({ error: error.message }); return }
      next(error)
    }
  },

  async consultarEstado(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const idCliente = BigInt(req.params.id as string)
      const estado = await clienteMembresiaService.consultarEstado(idCliente, idGimnasio)
      res.json(estado)
    } catch (error: any) {
      if (error.statusCode) { res.status(error.statusCode).json({ error: error.message }); return }
      next(error)
    }
  },

  async renovar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const id = BigInt(req.params.id as string)
      const result = await clienteMembresiaService.renovar(id, idGimnasio)
      res.status(201).json({ id_cliente_membresia: result.id_cliente_membresia })
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }
      next(error)
    }
  },
}
