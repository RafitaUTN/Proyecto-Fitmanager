import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { usuarioController } from '../controllers/usuario.controller'

export const usuarioRouter = Router()

usuarioRouter.use(authMiddleware)
usuarioRouter.get('/', authorize('Administrador'), usuarioController.listar)
usuarioRouter.post('/', authorize('Administrador'), usuarioController.crear)
usuarioRouter.put('/:id', authorize('Administrador'), usuarioController.actualizar)
usuarioRouter.delete('/:id', authorize('Administrador'), usuarioController.eliminar)
