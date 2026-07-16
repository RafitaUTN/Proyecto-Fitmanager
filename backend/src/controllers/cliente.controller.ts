import type { Request, Response, NextFunction } from 'express'
import { crearClienteSchema, actualizarClienteSchema } from '../dtos/cliente.dto'
import { clienteService } from '../services/cliente.service'

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

export const clienteController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const clientes = await clienteService.listar(idGimnasio)
      res.json(clientes)
    } catch (error) { next(error) }
  },

  async buscar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = BigInt(req.params.id as string)
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const cliente = await clienteService.buscar(id, idGimnasio)
      res.json(cliente)
    } catch (error) { next(error) }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearClienteSchema.parse(req.body)
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const cliente = await clienteService.crear(idGimnasio, dto)
      res.status(201).json({ id_cliente: cliente.id_cliente })
    } catch (error) { handleError(res, error, next) }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = actualizarClienteSchema.parse(req.body)
      const id = BigInt(req.params.id as string)
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const cliente = await clienteService.actualizar(id, dto, idGimnasio)
      res.json(cliente)
    } catch (error) { handleError(res, error, next) }
  },
}
