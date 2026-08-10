import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { pagoController } from '../controllers/pago.controller'

export const pagoRouter = Router()

pagoRouter.use(authMiddleware)
pagoRouter.get('/', authorize('Administrador', 'Recepcionista'), pagoController.listar)
pagoRouter.get('/resumen/:id', authorize('Administrador', 'Recepcionista'), pagoController.resumen)
pagoRouter.post('/', authorize('Administrador', 'Recepcionista'), pagoController.registrar)
