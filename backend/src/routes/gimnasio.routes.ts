/**
 * Rutas Express del módulo gimnasio.routes.
 *
 * @remarks Declara endpoints, middlewares de autenticación y permisos requeridos para acceder al recurso.
 */
import { Router } from 'express'
import { gimnasioController } from '../controllers/gimnasio.controller'

export const gimnasioRouter = Router()

gimnasioRouter.post('/', gimnasioController.registrar)
