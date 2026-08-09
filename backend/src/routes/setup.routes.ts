import { Router } from 'express'
import { setupController } from '../controllers/setup.controller'

export const setupRouter = Router()

setupRouter.post('/forgot-password', setupController.solicitarRecuperacion)
setupRouter.post('/reset-password', setupController.restablecerPassword)
setupRouter.get('/verificar', setupController.verificarToken)
setupRouter.post('/setup-password', setupController.setupPassword)
