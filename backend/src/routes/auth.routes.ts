import { Router } from 'express'
import { authController } from '../controllers/auth.controller'

export const authRouter = Router()

authRouter.post('/login', authController.login)
authRouter.post('/refresh', authController.refresh)
authRouter.post('/logout', authController.logout)
