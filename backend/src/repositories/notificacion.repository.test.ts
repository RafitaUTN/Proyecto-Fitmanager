import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prisma } = vi.hoisted(() => ({
  prisma: {
    notificacion: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
  },
}))

vi.mock('../lib/prisma', () => ({ prisma }))

import { notificacionRepository } from './notificacion.repository'

describe('notificacionRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listarAdmin', () => {
    it('devuelve todas las notificaciones del gimnasio', async () => {
      prisma.notificacion.findMany.mockResolvedValue([])
      await notificacionRepository.listarAdmin(3n, 'MEMBRESIA')
      expect(prisma.notificacion.findMany).toHaveBeenCalledWith({
        where: { id_gimnasio: 3n, tipo: 'MEMBRESIA' },
        include: expect.any(Object),
        orderBy: { fecha_envio: 'desc' },
        skip: 0,
        take: 20,
      })
    })

    it('traslada pagina y limite a skip/take', async () => {
      prisma.notificacion.findMany.mockResolvedValue([])
      await notificacionRepository.listarPorGimnasio(3n, undefined, 3, 15)
      expect(prisma.notificacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 30, take: 15 }),
      )
    })

    it('cuenta con el mismo filtro que la pagina', async () => {
      prisma.notificacion.count.mockResolvedValue(7)
      await notificacionRepository.contarPorGimnasio(3n, 'MEMBRESIA')
      expect(prisma.notificacion.count).toHaveBeenCalledWith({
        where: { id_gimnasio: 3n, tipo: 'MEMBRESIA' },
      })
    })
  })

  describe('listarRecepcion', () => {
    it('solo notificaciones dirigidas a recepcion o sin rol', async () => {
      prisma.notificacion.findMany.mockResolvedValue([])
      await notificacionRepository.listarRecepcion(3n)
      expect(prisma.notificacion.findMany).toHaveBeenCalledWith({
        where: {
          id_gimnasio: 3n,
          OR: [{ rol_destino: 'Recepcionista' }, { rol_destino: null }],
        },
        include: expect.any(Object),
        orderBy: { fecha_envio: 'desc' },
        skip: 0,
        take: 20,
      })
    })

    it('cuenta recepcion con el mismo filtro', async () => {
      prisma.notificacion.count.mockResolvedValue(2)
      await notificacionRepository.contarRecepcion(3n)
      expect(prisma.notificacion.count).toHaveBeenCalledWith({
        where: {
          id_gimnasio: 3n,
          OR: [{ rol_destino: 'Recepcionista' }, { rol_destino: null }],
        },
      })
    })
  })

  describe('listarEntrenador', () => {
    it('solo notificaciones cuyo destinatario es el entrenador', async () => {
      prisma.notificacion.findMany.mockResolvedValue([])
      await notificacionRepository.listarEntrenador(5n, 3n)
      expect(prisma.notificacion.findMany).toHaveBeenCalledWith({
        where: { id_usuario_destino: 5n },
        include: expect.any(Object),
        orderBy: { fecha_envio: 'desc' },
        skip: 0,
        take: 20,
      })
    })

    it('cuenta al entrenador con el mismo filtro', async () => {
      prisma.notificacion.count.mockResolvedValue(3)
      await notificacionRepository.contarEntrenador(5n, 3n)
      expect(prisma.notificacion.count).toHaveBeenCalledWith({ where: { id_usuario_destino: 5n } })
    })
  })

  describe('contarNoLeidasAdmin', () => {
    it('cuenta todas las no leidas del gimnasio', async () => {
      prisma.notificacion.count.mockResolvedValue(7)
      const total = await notificacionRepository.contarNoLeidasAdmin(3n)
      expect(total).toBe(7)
      expect(prisma.notificacion.count).toHaveBeenCalledWith({
        where: { id_gimnasio: 3n, leida: false },
      })
    })
  })

  describe('marcarLeidaCliente', () => {
    it('actualiza solo las notificaciones del cliente en el gimnasio', async () => {
      prisma.notificacion.updateMany.mockResolvedValue({ count: 1 })
      await notificacionRepository.marcarLeidaCliente(1n, 7n, 3n)
      expect(prisma.notificacion.updateMany).toHaveBeenCalledWith({
        where: { id_notificacion: 1n, id_cliente: 7n, cliente: { id_gimnasio: 3n } },
        data: { leida: true },
      })
    })
  })
})
