import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { reporteService } from '../services/reporte.service'
import { reporteQuerySchema } from '../dtos/reporte.dto'
import { safeBigInt } from '../lib/bigint'

const exportSchema = reporteQuerySchema.extend({
  tipo: z.enum(['ingresos-mensuales', 'nuevos-clientes', 'asistencias', 'distribucion-membresias', 'metodos-pago', 'ingresos-diarios', 'asistencias-por-hora', 'clientes-activos-inactivos', 'pagos-detalle']),
  formato: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
  nombre_gimnasio: z.string().optional(),
})

export const reporteController = {
  async ingresosMensuales(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const { fecha_inicio, fecha_fin } = reporteQuerySchema.parse(req.query)
      const data = await reporteService.ingresosMensuales(idGimnasio, fecha_inicio, fecha_fin)
      res.json(data)
    } catch (error) { next(error) }
  },

  async nuevosClientes(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const { fecha_inicio, fecha_fin } = reporteQuerySchema.parse(req.query)
      const data = await reporteService.nuevosClientes(idGimnasio, fecha_inicio, fecha_fin)
      res.json(data)
    } catch (error) { next(error) }
  },

  async asistencias(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const { fecha_inicio, fecha_fin } = reporteQuerySchema.parse(req.query)
      const data = await reporteService.asistencias(idGimnasio, fecha_inicio, fecha_fin)
      res.json(data)
    } catch (error) { next(error) }
  },

  async distribucionMembresias(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const data = await reporteService.distribucionMembresias(idGimnasio)
      res.json(data)
    } catch (error) { next(error) }
  },

  async metodosPago(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const { fecha_inicio, fecha_fin } = reporteQuerySchema.parse(req.query)
      const data = await reporteService.metodosPago(idGimnasio, fecha_inicio, fecha_fin)
      res.json(data)
    } catch (error) { next(error) }
  },

  async ingresosDiarios(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const { fecha_inicio, fecha_fin } = reporteQuerySchema.parse(req.query)
      const data = await reporteService.ingresosDiarios(idGimnasio, fecha_inicio, fecha_fin)
      res.json(data)
    } catch (error) { next(error) }
  },

  async asistenciasPorHora(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const { fecha_inicio, fecha_fin } = reporteQuerySchema.parse(req.query)
      const data = await reporteService.asistenciasPorHora(idGimnasio, fecha_inicio, fecha_fin)
      res.json(data)
    } catch (error) { next(error) }
  },

  async clientesActivosVsInactivos(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const data = await reporteService.clientesActivosVsInactivos(idGimnasio)
      res.json(data)
    } catch (error) { next(error) }
  },

  async exportarConGraficos(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const schema = z.object({
        tipo: z.enum(['ingresos-mensuales', 'nuevos-clientes', 'asistencias', 'distribucion-membresias', 'metodos-pago', 'ingresos-diarios', 'asistencias-por-hora', 'clientes-activos-inactivos', 'pagos-detalle']),
        formato: z.enum(['xlsx', 'pdf']),
        nombre_gimnasio: z.string().optional(),
        fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        graficos: z.array(z.string()).optional(),
      })
      const { tipo, formato, nombre_gimnasio, fecha_inicio, fecha_fin, graficos } = schema.parse(req.body)
      const result = await reporteService.exportarConGraficos(idGimnasio, tipo, formato, nombre_gimnasio || '', graficos || [], fecha_inicio, fecha_fin)
      const filename = `${tipo}-${new Date().toISOString().split('T')[0]}.${result.ext}`
      res.setHeader('Content-Type', result.mime)
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(result.data)
    } catch (error) { next(error) }
  },

  async exportar(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const { tipo, formato, fecha_inicio, fecha_fin, nombre_gimnasio } = exportSchema.parse(req.query)
      const result = await reporteService.exportar(idGimnasio, tipo, formato, nombre_gimnasio || '', fecha_inicio, fecha_fin)
      const filename = `${tipo}-${new Date().toISOString().split('T')[0]}.${result.ext}`
      res.setHeader('Content-Type', result.mime)
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(result.data)
    } catch (error) { next(error) }
  },
}
