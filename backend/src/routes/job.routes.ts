import { Router } from 'express'
import { jobController } from '../controllers/job.controller'

export const jobRouter = Router()
jobRouter.get('/payment-window', jobController.paymentWindow)
