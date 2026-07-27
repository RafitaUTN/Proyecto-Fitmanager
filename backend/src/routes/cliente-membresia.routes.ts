import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { clienteMembresiaController } from '../controllers/cliente-membresia.controller'

export const clienteMembresiaRouter = Router()

clienteMembresiaRouter.use(authMiddleware)
clienteMembresiaRouter.post('/cambiar-plan', authorize('Administrador', 'Recepcionista'), clienteMembresiaController.cambiarPlan)
clienteMembresiaRouter.get('/', authorize('Administrador', 'Recepcionista'), clienteMembresiaController.listar)
clienteMembresiaRouter.post('/', authorize('Administrador', 'Recepcionista'), clienteMembresiaController.asignar)
clienteMembresiaRouter.post('/:id/cancelar', authorize('Administrador', 'Recepcionista'), clienteMembresiaController.cancelar)
clienteMembresiaRouter.get('/:id/estado', authorize('Administrador', 'Recepcionista'), clienteMembresiaController.consultarEstado)
clienteMembresiaRouter.post('/:id/renovar', authorize('Administrador', 'Recepcionista'), clienteMembresiaController.renovar)
