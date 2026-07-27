import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { rutinaController } from '../controllers/rutina.controller'

export const rutinaRouter = Router()

rutinaRouter.use(authMiddleware)
rutinaRouter.get('/', authorize('Administrador', 'Entrenador'), rutinaController.listar)
rutinaRouter.get('/:id', authorize('Administrador', 'Entrenador'), rutinaController.obtener)
rutinaRouter.post('/', authorize('Administrador', 'Entrenador'), rutinaController.crear)
rutinaRouter.put('/:id', authorize('Administrador', 'Entrenador'), rutinaController.actualizar)
rutinaRouter.delete('/:id', authorize('Administrador'), rutinaController.eliminar)
rutinaRouter.post('/:id/asignar-entrenador', authorize('Administrador'), rutinaController.asignarEntrenador)
rutinaRouter.delete('/:id/asignar-entrenador/:idEntrenador', authorize('Administrador'), rutinaController.removerEntrenador)
rutinaRouter.get('/:id/entrenadores', authorize('Administrador'), rutinaController.listarEntrenadoresAsignados)
rutinaRouter.post('/:id/asignar', authorize('Administrador', 'Entrenador'), rutinaController.asignarCliente)
rutinaRouter.get('/:id/asignaciones', authorize('Administrador', 'Entrenador'), rutinaController.listarAsignaciones)

// Client routine snapshot endpoints
rutinaRouter.get('/cliente-rutina/:idClienteRutina', authorize('Administrador', 'Entrenador'), rutinaController.obtenerClienteRutina)
rutinaRouter.put('/cliente-rutina/:idClienteRutina', authorize('Administrador', 'Entrenador'), rutinaController.actualizarClienteRutina)
rutinaRouter.put('/cliente-rutina/:idClienteRutina/ejercicios/:idEjercicio', authorize('Administrador', 'Entrenador'), rutinaController.actualizarEjercicioCliente)
rutinaRouter.get('/cliente/:idCliente/rutinas', authorize('Administrador', 'Entrenador'), rutinaController.listarRutinasDeCliente)
