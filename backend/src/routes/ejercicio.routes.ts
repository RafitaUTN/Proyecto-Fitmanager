import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { ejercicioController } from '../controllers/ejercicio.controller'

export const ejercicioRouter = Router()

ejercicioRouter.use(authMiddleware)
ejercicioRouter.get('/', authorize('Administrador'), ejercicioController.listar)
ejercicioRouter.post('/', authorize('Administrador'), ejercicioController.crear)
ejercicioRouter.put('/:id', authorize('Administrador'), ejercicioController.actualizar)
ejercicioRouter.delete('/:id', authorize('Administrador'), ejercicioController.eliminar)
