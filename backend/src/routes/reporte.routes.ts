import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { reporteController } from '../controllers/reporte.controller'

export const reporteRouter = Router()

reporteRouter.use(authMiddleware)
reporteRouter.use(authorize('Administrador'))

reporteRouter.get('/ingresos-mensuales', reporteController.ingresosMensuales)
reporteRouter.get('/nuevos-clientes', reporteController.nuevosClientes)
reporteRouter.get('/asistencias', reporteController.asistencias)
reporteRouter.get('/distribucion-membresias', reporteController.distribucionMembresias)
reporteRouter.get('/metodos-pago', reporteController.metodosPago)
reporteRouter.get('/ingresos-diarios', reporteController.ingresosDiarios)
reporteRouter.get('/asistencias-por-hora', reporteController.asistenciasPorHora)
reporteRouter.get('/clientes-activos-inactivos', reporteController.clientesActivosVsInactivos)
reporteRouter.get('/exportar', reporteController.exportar)
reporteRouter.post('/exportar-con-graficos', reporteController.exportarConGraficos)
