import type { Request, Response, NextFunction } from 'express'
import { crearPagoSchema } from '../dtos/pago.dto'
import { pagoService } from '../services/pago.service'
import { safeBigInt } from '../lib/bigint'

export const pagoController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idCliente = req.query.id_cliente ? safeBigInt(req.query.id_cliente as string) : undefined
      const pagos = await pagoService.listar(idGimnasio, idCliente)
      res.json(pagos)
    } catch (error) { next(error) }
  },

  async registrar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearPagoSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const pago = await pagoService.registrar(idGimnasio, dto)
      res.status(201).json(pago)
    } catch (error) { next(error) }
  },

  async resumen(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idAsignacion = safeBigInt(req.params.id, 'id de cliente-membresía')
      res.json(await pagoService.resumen(idGimnasio, idAsignacion))
    } catch (error) { next(error) }
  },
}
