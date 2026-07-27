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
clientePortalRouter.put('/me/contrasena', clientePortalController.cambiarPassword)
