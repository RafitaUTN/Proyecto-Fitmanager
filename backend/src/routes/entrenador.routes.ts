import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { entrenadorController } from '../controllers/entrenador.controller'

export const entrenadorRouter = Router()

entrenadorRouter.use(authMiddleware)
entrenadorRouter.get('/disponibles', authorize('Administrador', 'Recepcionista'), entrenadorController.disponibles)