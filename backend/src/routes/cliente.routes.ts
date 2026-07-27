import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
import { clienteController } from '../controllers/cliente.controller'
import { clienteAuthService } from '../services/cliente-auth.service'
import { safeBigInt } from '../lib/bigint'

export const clienteRouter = Router()

clienteRouter.use(authMiddleware)
clienteRouter.get('/', authorize('Administrador', 'Recepcionista', 'Entrenador'), clienteController.listar)
clienteRouter.get('/:id', authorize('Administrador', 'Recepcionista', 'Entrenador'), clienteController.buscar)
clienteRouter.post('/', authorize('Administrador', 'Recepcionista'), clienteController.crear)
clienteRouter.put('/:id', authorize('Administrador', 'Recepcionista'), clienteController.actualizar)
clienteRouter.delete('/:id', authorize('Administrador'), clienteController.eliminar)

// Client access management
clienteRouter.post('/:id/generar-acceso', authorize('Administrador'), async (req, res, next) => {
  try {
    const idCliente = safeBigInt(req.params.id, 'id de cliente')
    const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
    const resultado = await clienteAuthService.generarAcceso(idCliente, idGimnasio)
    res.json(resultado)
  } catch (error) { next(error) }
})
