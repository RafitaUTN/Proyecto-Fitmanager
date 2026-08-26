/**
 * Rutas Express del módulo setup.routes.
 *
 * @remarks Declara endpoints, middlewares de autenticación y permisos requeridos para acceder al recurso.
 */
import { Router } from 'express'
import { setupController } from '../controllers/setup.controller'

export const setupRouter = Router()

setupRouter.post('/forgot-password', setupController.solicitarRecuperacion)
setupRouter.post('/reset-password', setupController.restablecerPassword)
setupRouter.get('/verificar', setupController.verificarToken)
setupRouter.post('/setup-password', setupController.setupPassword)
