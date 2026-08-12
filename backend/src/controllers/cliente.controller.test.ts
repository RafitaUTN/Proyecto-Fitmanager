import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clienteController } from './cliente.controller'
import { clienteService } from '../services/cliente.service'
import { clienteMembresiaService } from '../services/cliente-membresia.service'

function response() {
  const res: any = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

describe('clienteController tenant/RBAC', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('rechaza que un entrenador amplíe el filtro a otro entrenador', async () => {
    const req: any = {
      context: { actorId: 11n, gymId: 1n, actorType: 'STAFF', role: 'Entrenador' },
      query: { id_entrenador: '12' },
    }
    const res = response()
    const next = vi.fn()
    const listar = vi.spyOn(clienteService, 'listarPorEntrenador')

    await clienteController.listar(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(listar).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('fuerza el actor autenticado al listar clientes del entrenador', async () => {
    const req: any = {
      context: { actorId: 11n, gymId: 1n, actorType: 'STAFF', role: 'Entrenador' },
      query: {},
    }
    const res = response()
    const clientes = [{ id_cliente: 5n }]
    const listar = vi.spyOn(clienteService, 'listarPorEntrenador').mockResolvedValue(clientes as never)

    await clienteController.listar(req, res, vi.fn())

    expect(listar).toHaveBeenCalledWith(11n, 1n)
    expect(res.json).toHaveBeenCalledWith(clientes)
  })
})

describe('clienteController perfil', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('devuelve el perfil usando el gimnasio del usuario autenticado', async () => {
    const perfil = {
      cliente: { id_cliente: 5n, nombre: 'Juan', apellido: 'Pérez' },
      membresiaActiva: null,
      membresiaVencida: null,
      historial: [],
    }
    const consultar = vi.spyOn(clienteMembresiaService, 'consultarEstado').mockResolvedValue(perfil as never)
    const req: any = {
      params: { id: '5' },
      usuario: { id_gimnasio: 1n },
    }
    const res = response()

    await clienteController.perfil(req, res, vi.fn())

    expect(consultar).toHaveBeenCalledWith(5n, 1n)
    expect(res.json).toHaveBeenCalledWith(perfil)
  })

  it('delega a next cuando el cliente no pertenece al gimnasio', async () => {
    const err = Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    vi.spyOn(clienteMembresiaService, 'consultarEstado').mockRejectedValue(err)
    const req: any = {
      params: { id: '999' },
      usuario: { id_gimnasio: 2n },
    }
    const res = response()
    const next = vi.fn()

    await clienteController.perfil(req, res, next)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(err)
  })
})

