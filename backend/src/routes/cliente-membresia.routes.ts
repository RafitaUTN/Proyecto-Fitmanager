import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { clienteMembresiaController } from '../controllers/cliente-membresia.controller'

export const clienteMembresiaRouter = Router()

clienteMembresiaRouter.use(authMiddleware)
clienteMembresiaRouter.get('/', clienteMembresiaController.listar)
clienteMembresiaRouter.post('/', clienteMembresiaController.asignar)
clienteMembresiaRouter.post('/:id/renovar', clienteMembresiaController.renovar)
