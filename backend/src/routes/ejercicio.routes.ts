import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { ejercicioController } from '../controllers/ejercicio.controller'

export const ejercicioRouter = Router()

ejercicioRouter.use(authMiddleware)
ejercicioRouter.get('/', authorize('Administrador', 'Entrenador'), ejercicioController.listar)
ejercicioRouter.post('/', authorize('Administrador', 'Entrenador'), ejercicioController.crear)
ejercicioRouter.put('/:id', authorize('Administrador', 'Entrenador'), ejercicioController.actualizar)
ejercicioRouter.delete('/:id', authorize('Administrador'), ejercicioController.eliminar)
