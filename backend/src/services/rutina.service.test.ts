import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tx, transaction, buscarPorId, buscarAsignacionActiva } = vi.hoisted(() => {
  const transactionClient = {
    cliente: { findFirst: vi.fn() },
    clienteRutina: { create: vi.fn(), deleteMany: vi.fn() },
    clienteRutinaEjercicio: { createMany: vi.fn() },
    rutinaEjercicio: { findMany: vi.fn() },
    ejercicio: { count: vi.fn() },
    usuario: { findFirst: vi.fn() },
    rutinaEntrenador: { findUnique: vi.fn() },
  }
  return {
    tx: transactionClient,
    transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) => callback(transactionClient)),
    buscarPorId: vi.fn(),
    buscarAsignacionActiva: vi.fn(),
  }
})

vi.mock('../lib/prisma', () => ({ prisma: { $transaction: transaction, cliente: { findFirst: vi.fn() } } }))
vi.mock('../repositories/rutina.repository', () => ({
  rutinaRepository: {
    buscarPorId,
    buscarAsignacionActiva,
  },
}))
vi.mock('./notification-factory.service', () => ({
  notificationFactory: { crear: vi.fn() },
}))

import { rutinaService } from './rutina.service'

const trainer = { actorId: 7n, gymId: 1n, actorType: 'STAFF' as const, role: 'Entrenador' as const }

describe('rutinaService aislamiento al asignar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    buscarAsignacionActiva.mockResolvedValue(null)
  })

  it('deniega una rutina que no pertenece o no está asignada al entrenador', async () => {
    buscarPorId.mockResolvedValue(null)
    await expect(rutinaService.asignarCliente(99n, trainer, { id_cliente: 3 }))
      .rejects.toMatchObject({ statusCode: 404 })
    expect(buscarPorId).toHaveBeenCalledWith(99n, 1n, 7n, tx)
    expect(tx.cliente.findFirst).not.toHaveBeenCalled()
  })

  it('deniega un cliente ajeno o de otro gimnasio', async () => {
    buscarPorId.mockResolvedValue({ id_rutina: 2n, nombre: 'A' })
    tx.cliente.findFirst.mockResolvedValue(null)
    await expect(rutinaService.asignarCliente(2n, trainer, { id_cliente: 88 }))
      .rejects.toMatchObject({ statusCode: 404 })
    expect(tx.cliente.findFirst).toHaveBeenCalledWith({
      where: { id_cliente: 88n, id_gimnasio: 1n, estado: true, id_entrenador: 7n },
    })
  })
})
