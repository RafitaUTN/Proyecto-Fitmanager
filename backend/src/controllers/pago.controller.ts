import type { Request, Response, NextFunction } from 'express'
import { crearPagoSchema } from '../dtos/pago.dto'
import { pagoService } from '../services/pago.service'

export const pagoController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const pagos = await pagoService.listar(idGimnasio)
      res.json(pagos)
    } catch (error) { next(error) }
  },

  async registrar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearPagoSchema.parse(req.body)
      const idGimnasio = BigInt((req as any).usuario.id_gimnasio)
      const pago = await pagoService.registrar(idGimnasio, dto)
      res.status(201).json({ id_pago: pago.id_pago })
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
}
