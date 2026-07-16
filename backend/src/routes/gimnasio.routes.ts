import { Router } from 'express'
import { gimnasioController } from '../controllers/gimnasio.controller'

export const gimnasioRouter = Router()

gimnasioRouter.post('/', gimnasioController.registrar)
