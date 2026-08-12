import { Router } from 'express'
import { authController } from '../controllers/auth.controller'

export const authRouter = Router()

authRouter.post('/login', authController.login)
authRouter.get('/csrf', authController.csrf)
authRouter.post('/refresh', authController.refresh)
authRouter.post('/logout', authController.logout)
authRouter.get('/health', authController.health)
