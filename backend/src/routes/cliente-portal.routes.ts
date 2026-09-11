/**
 * Rutas Express del módulo cliente-portal.routes.
 *
 * @remarks Declara endpoints, middlewares de autenticación y permisos requeridos para acceder al recurso.
 */
import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { clientePortalController } from '../controllers/cliente-portal.controller'

export const clientePortalRouter = Router()

clientePortalRouter.use(authMiddleware)
clientePortalRouter.use(authorize('Cliente'))

clientePortalRouter.get('/me', clientePortalController.perfil)
clientePortalRouter.get('/me/membresia', clientePortalController.membresia)
clientePortalRouter.get('/me/rutinas', clientePortalController.rutinas)
clientePortalRouter.get('/me/rutinas/calendario', clientePortalController.calendarioRutinas)
clientePortalRouter.patch('/me/rutinas/programadas/:id/completar', clientePortalController.completarRutinaProgramada)
clientePortalRouter.get('/me/asistencia/actual', clientePortalController.asistenciaActual)
clientePortalRouter.post('/me/asistencia/entrada', clientePortalController.registrarEntrada)
clientePortalRouter.post('/me/asistencia/salida', clientePortalController.registrarSalida)
clientePortalRouter.get('/me/notificaciones', clientePortalController.notificaciones)
clientePortalRouter.get('/me/notificaciones/contar', clientePortalController.contarNotificaciones)
clientePortalRouter.put('/me/notificaciones/:id/leer', clientePortalController.marcarNotificacionLeida)
clientePortalRouter.put('/me/contrasena', clientePortalController.cambiarPassword)
