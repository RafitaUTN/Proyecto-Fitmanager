import { Router } from 'express'
import { setupController } from '../controllers/setup.controller'

export const setupRouter = Router()

setupRouter.get('/verificar', setupController.verificarToken)
setupRouter.post('/setup-password', setupController.setupPassword)
