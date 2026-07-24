import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authController } from '../controllers/auth.controller'

export const authRouter = Router()

authRouter.post('/login', authController.login)
authRouter.post('/refresh', authController.refresh)
authRouter.post('/logout', authMiddleware, authController.logout)
authRouter.get('/health', authController.health)
