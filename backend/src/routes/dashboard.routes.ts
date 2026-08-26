/**
 * Rutas Express del módulo dashboard.routes.
 *
 * @remarks Declara endpoints, middlewares de autenticación y permisos requeridos para acceder al recurso.
 */
import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { dashboardController } from '../controllers/dashboard.controller'

export const dashboardRouter = Router()

dashboardRouter.use(authMiddleware)
dashboardRouter.get(
  '/indicadores',
  authorize('Administrador', 'Recepcionista', 'Entrenador'),
  dashboardController.indicadores,
)
