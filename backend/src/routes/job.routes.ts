/**
 * Rutas Express del módulo job.routes.
 *
 * @remarks Declara endpoints, middlewares de autenticación y permisos requeridos para acceder al recurso.
 */
import { Router } from 'express'
import { jobController } from '../controllers/job.controller'

export const jobRouter = Router()
jobRouter.get('/payment-window', jobController.paymentWindow)
