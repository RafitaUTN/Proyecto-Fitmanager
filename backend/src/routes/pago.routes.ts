import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { pagoController } from '../controllers/pago.controller'

export const pagoRouter = Router()

pagoRouter.use(authMiddleware)
pagoRouter.get('/', pagoController.listar)
pagoRouter.post('/', pagoController.registrar)
