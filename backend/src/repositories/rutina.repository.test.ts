import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rutinaFindFirst, clienteRutinaFindFirst, clienteRutinaFindMany, ejercicioFindFirst } = vi.hoisted(() => ({
  rutinaFindFirst: vi.fn(),
  clienteRutinaFindFirst: vi.fn(),
  clienteRutinaFindMany: vi.fn(),
  ejercicioFindFirst: vi.fn(),
}))

vi.mock('../lib/prisma', () => ({
  prisma: {
    rutina: { findFirst: rutinaFindFirst },
    rutinaEjercicio: {},
    rutinaEntrenador: {},
    clienteRutina: { findFirst: clienteRutinaFindFirst, findMany: clienteRutinaFindMany },
    clienteRutinaEjercicio: { findFirst: ejercicioFindFirst },
  },
}))

import { rutinaRepository } from './rutina.repository'

describe('rutinaRepository tenant-safe', () => {
  beforeEach(() => vi.clearAllMocks())

  it('busca rutina por id, gimnasio y entrenador asignado', async () => {
    rutinaFindFirst.mockResolvedValue(null)
    await rutinaRepository.buscarPorId(8n, 2n, 15n)
    expect(rutinaFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id_rutina: 8n,
        id_gimnasio: 2n,
        entrenadores: { some: { id_entrenador: 15n, estado: true } },
      },
    }))
  })

  it('protege snapshot por ambos tenants y cliente asignado al entrenador', async () => {
    clienteRutinaFindFirst.mockResolvedValue(null)
    await rutinaRepository.buscarClienteRutina(30n, 2n, 15n)
    expect(clienteRutinaFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id_cliente_rutina: 30n,
        cliente: { id_gimnasio: 2n, id_entrenador: 15n },
        rutina: { id_gimnasio: 2n },
      }),
    }))
  })

  it('protege el ejercicio materializado a través de su asignación', async () => {
    ejercicioFindFirst.mockResolvedValue(null)
    await rutinaRepository.buscarEjercicioCliente(44n, 2n, 15n)
    expect(ejercicioFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        cliente_rutina: {
          cliente: { id_gimnasio: 2n, id_entrenador: 15n },
          rutina: { id_gimnasio: 2n },
        },
      }),
    }))
  })
})
