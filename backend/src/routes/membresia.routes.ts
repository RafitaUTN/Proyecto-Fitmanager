import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { membresiaController } from '../controllers/membresia.controller'

export const membresiaRouter = Router()

membresiaRouter.use(authMiddleware)
membresiaRouter.get('/', membresiaController.listar)
membresiaRouter.post('/', membresiaController.crear)
membresiaRouter.put('/:id', membresiaController.actualizar)
