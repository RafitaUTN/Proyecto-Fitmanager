import type { Request, Response, NextFunction } from 'express'
import { crearPagoSchema } from '../dtos/pago.dto'
import { pagoService } from '../services/pago.service'
import { AppError } from '../lib/errors'
import { safeBigInt } from '../lib/bigint'

function parseFecha(valor: string, nombre: string, finDeDia = false): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new AppError(`Parámetro ${nombre} inválido, use el formato YYYY-MM-DD`, 400, 'FECHA_INVALIDA')
  }
  const [año, mes, dia] = valor.split('-').map(Number)
  const fecha = new Date(año, mes - 1, dia)
  if (finDeDia) fecha.setHours(23, 59, 59, 999)
  return fecha
}

export const pagoController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const idCliente = req.query.id_cliente ? safeBigInt(req.query.id_cliente as string) : undefined
      const fechaInicio = req.query.fecha_inicio ? parseFecha(req.query.fecha_inicio as string, 'fecha_inicio') : undefined
      const fechaFin = req.query.fecha_fin ? parseFecha(req.query.fecha_fin as string, 'fecha_fin', true) : undefined
      const pagos = await pagoService.listar(idGimnasio, idCliente, fechaInicio, fechaFin)
      res.json(pagos)
    } catch (error) { next(error) }
  },

  async registrar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = crearPagoSchema.parse(req.body)
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const pago = await pagoService.registrar(idGimnasio, dto, req.usuario.rol)
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
