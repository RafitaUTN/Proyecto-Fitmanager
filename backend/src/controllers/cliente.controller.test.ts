import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clienteController } from './cliente.controller'
import { clienteService } from '../services/cliente.service'

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

