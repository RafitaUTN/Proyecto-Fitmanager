/**
 * Rutas Express para programación de rutinas.
 *
 * @remarks Solo Administrador y Entrenador pueden gestionar sesiones. El
 * service vuelve a validar tenant, entrenador y conflictos de horario.
 */
import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { programacionRutinaController } from '../controllers/programacion-rutina.controller'

export const programacionRutinaRouter = Router()

programacionRutinaRouter.use(authMiddleware)
programacionRutinaRouter.get('/', authorize('Administrador', 'Entrenador'), programacionRutinaController.listar)
programacionRutinaRouter.post('/', authorize('Administrador', 'Entrenador'), programacionRutinaController.crear)
programacionRutinaRouter.patch('/:id', authorize('Administrador', 'Entrenador'), programacionRutinaController.actualizar)
programacionRutinaRouter.post('/:id/cancelar', authorize('Administrador', 'Entrenador'), programacionRutinaController.cancelar)
