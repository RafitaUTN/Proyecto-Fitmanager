import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { usuarioController } from '../controllers/usuario.controller'

export const usuarioRouter = Router()

usuarioRouter.use(authMiddleware)
usuarioRouter.get('/', usuarioController.listar)
usuarioRouter.post('/', usuarioController.crear)
usuarioRouter.put('/:id', usuarioController.actualizar)
usuarioRouter.delete('/:id', usuarioController.eliminar)
