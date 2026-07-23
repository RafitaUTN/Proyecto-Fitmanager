import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { clienteController } from '../controllers/cliente.controller'

export const clienteRouter = Router()

clienteRouter.use(authMiddleware)
clienteRouter.get('/', clienteController.listar)
clienteRouter.get('/:id', clienteController.buscar)
clienteRouter.post('/', clienteController.crear)
clienteRouter.put('/:id', clienteController.actualizar)
clienteRouter.delete('/:id', clienteController.eliminar)
