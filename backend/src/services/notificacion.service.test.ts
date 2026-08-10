import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  prisma,
  notificacionRepository,
  notificationFactory,
} = vi.hoisted(() => ({
  prisma: {
    notificacion: { findFirst: vi.fn(), findUnique: vi.fn() },
    clienteMembresia: { findMany: vi.fn() },
  },
  notificacionRepository: {
    listarAdmin: vi.fn(),
    listarRecepcion: vi.fn(),
    listarEntrenador: vi.fn(),
    listarCliente: vi.fn(),
    contarNoLeidasAdmin: vi.fn(),
    contarNoLeidasRecepcion: vi.fn(),
    contarNoLeidasEntrenador: vi.fn(),
    contarNoLeidasCliente: vi.fn(),
    marcarLeida: vi.fn(),
    crearMuchas: vi.fn(),
  },
  notificationFactory: { crear: vi.fn() },
}))

vi.mock('../lib/prisma', () => ({ prisma }))
vi.mock('../repositories/notificacion.repository', () => ({ notificacionRepository }))
vi.mock('./notification-factory.service', () => ({ notificationFactory }))

import { notificacionService } from './notificacion.service'

describe('notificacionService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listar', () => {
    it('delega por rol', async () => {
      notificacionRepository.listarEntrenador.mockResolvedValue([])
      notificacionRepository.listarRecepcion.mockResolvedValue([])
      notificacionRepository.listarAdmin.mockResolvedValue([])

      await notificacionService.listar(3n, 'MEMBRESIA', 'Entrenador', 2)
      await notificacionService.listar(3n, 'MEMBRESIA', 'Recepcionista')
      await notificacionService.listar(3n, 'MEMBRESIA', 'Administrador')

      expect(notificacionRepository.listarEntrenador).toHaveBeenCalledWith(2n, 3n, 'MEMBRESIA')
      expect(notificacionRepository.listarRecepcion).toHaveBeenCalledWith(3n, 'MEMBRESIA')
      expect(notificacionRepository.listarAdmin).toHaveBeenCalledWith(3n, 'MEMBRESIA')
    })
  })

  describe('contarNoLeidas', () => {
    it('delega por rol', async () => {
      notificacionRepository.contarNoLeidasEntrenador.mockResolvedValue(1)
      notificacionRepository.contarNoLeidasRecepcion.mockResolvedValue(2)
      notificacionRepository.contarNoLeidasAdmin.mockResolvedValue(3)

      expect(await notificacionService.contarNoLeidas(3n, 'Entrenador', 2)).toBe(1)
      expect(await notificacionService.contarNoLeidas(3n, 'Recepcionista')).toBe(2)
      expect(await notificacionService.contarNoLeidas(3n, 'Administrador')).toBe(3)
    })
  })

  describe('crear y consultas de cliente', () => {
    it('crear delega en el factory', async () => {
      notificationFactory.crear.mockResolvedValue({})
      const input = { tipo: 'SISTEMA', destino: { id_cliente: 7n }, titulo: 't', mensaje: 'm' } as any
      await notificacionService.crear(input)
      expect(notificationFactory.crear).toHaveBeenCalledWith(input)
    })

    it('listarCliente y contarNoLeidasCliente delegan en el repositorio', async () => {
      notificacionRepository.listarCliente.mockResolvedValue([{ id_notificacion: 1n }])
      notificacionRepository.contarNoLeidasCliente.mockResolvedValue(4)
      expect(await notificacionService.listarCliente(7n, 3n, 'MEMBRESIA')).toEqual([{ id_notificacion: 1n }])
      expect(await notificacionService.contarNoLeidasCliente(7n, 3n)).toBe(4)
      expect(notificacionRepository.listarCliente).toHaveBeenCalledWith(7n, 3n, 'MEMBRESIA')
    })
  })

  describe('marcarLeidaCliente', () => {
    it('rechaza notificaciones inexistentes', async () => {
      prisma.notificacion.findFirst.mockResolvedValue(null)
      await expect(notificacionService.marcarLeidaCliente(1n, 7n, 3n)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('marca como leida', async () => {
      prisma.notificacion.findFirst.mockResolvedValue({ id_notificacion: 1n })
      notificacionRepository.marcarLeida.mockResolvedValue({ id_notificacion: 1n, leida: true })
      const r = await notificacionService.marcarLeidaCliente(1n, 7n, 3n)
      expect(prisma.notificacion.findFirst).toHaveBeenCalledWith({
        where: { id_notificacion: 1n, id_cliente: 7n, cliente: { id_gimnasio: 3n } },
        select: { id_notificacion: true },
      })
      expect(notificacionRepository.marcarLeida).toHaveBeenCalledWith(1n)
      expect(r).toEqual({ id_notificacion: 1n, leida: true })
    })
  })

  describe('marcarLeida', () => {
    const base = { id_notificacion: 1n, id_gimnasio: 3n, rol_destino: 'Administrador', id_usuario_destino: null, cliente: null }

    it('rechaza notificaciones inexistentes', async () => {
      prisma.notificacion.findUnique.mockResolvedValue(null)
      await expect(notificacionService.marcarLeida(1n, 3n)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('permite al entrenador destinatario', async () => {
      prisma.notificacion.findUnique.mockResolvedValue({ ...base, id_usuario_destino: 5n })
      notificacionRepository.marcarLeida.mockResolvedValue({})
      await notificacionService.marcarLeida(1n, 3n, 'Entrenador', 5)
      expect(notificacionRepository.marcarLeida).toHaveBeenCalledWith(1n)
    })

    it('rechaza al entrenador no destinatario', async () => {
      prisma.notificacion.findUnique.mockResolvedValue({ ...base, id_usuario_destino: 5n })
      await expect(notificacionService.marcarLeida(1n, 3n, 'Entrenador', 99)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza notificaciones de otro gimnasio', async () => {
      prisma.notificacion.findUnique.mockResolvedValue(base)
      await expect(notificacionService.marcarLeida(1n, 99n, 'Administrador')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza roles incompatibles', async () => {
      prisma.notificacion.findUnique.mockResolvedValue(base)
      await expect(notificacionService.marcarLeida(1n, 3n, 'Recepcionista')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('marca como leida para rol compatible', async () => {
      prisma.notificacion.findUnique.mockResolvedValue(base)
      notificacionRepository.marcarLeida.mockResolvedValue({ leida: true })
      const r = await notificacionService.marcarLeida(1n, 3n, 'Administrador')
      expect(r).toEqual({ leida: true })
    })

    it('acepta notificaciones sin rol destino', async () => {
      prisma.notificacion.findUnique.mockResolvedValue({ ...base, rol_destino: null })
      notificacionRepository.marcarLeida.mockResolvedValue({})
      await notificacionService.marcarLeida(1n, 3n, 'Recepcionista')
      expect(notificacionRepository.marcarLeida).toHaveBeenCalledWith(1n)
    })
  })

  describe('generarAlertas', () => {
    it('no genera alertas sin membresias proximas', async () => {
      prisma.clienteMembresia.findMany.mockResolvedValue([])
      const r = await notificacionService.generarAlertas(3n)
      expect(r).toEqual({ generadas: 0 })
      expect(notificacionRepository.crearMuchas).not.toHaveBeenCalled()
    })

    it('genera alertas para membresias que vencen en el horizonte', async () => {
      const membresia = {
        id_cliente_membresia: 1n,
        id_cliente: 7n,
        fecha_fin: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        cliente: { nombre: 'Juan', apellido: 'Perez' },
        membresia: { nombre: 'Premium' },
      }
      prisma.clienteMembresia.findMany.mockResolvedValue([membresia])
      notificacionRepository.crearMuchas.mockResolvedValue({ count: 3 })

      const r = await notificacionService.generarAlertas(3n)
      expect(r).toEqual({ generadas: 3 })
      expect(notificacionRepository.crearMuchas).toHaveBeenCalledTimes(1)
      const inputs = notificacionRepository.crearMuchas.mock.calls[0][0]
      expect(inputs).toHaveLength(3)
      expect(inputs[0]).toMatchObject({ id_cliente: 7n, id_gimnasio: undefined, tipo: 'MEMBRESIA' })
      expect(inputs[1]).toMatchObject({ id_gimnasio: 3n, rol_destino: 'Administrador', tipo: 'MEMBRESIA' })
      expect(inputs[2]).toMatchObject({ id_gimnasio: 3n, rol_destino: 'Recepcionista', tipo: 'MEMBRESIA' })
    })

    it('ignora membresias fuera del horizonte', async () => {
      prisma.clienteMembresia.findMany.mockResolvedValue([
        {
          id_cliente_membresia: 2n,
          id_cliente: 8n,
          fecha_fin: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          cliente: { nombre: 'Ana', apellido: 'Diaz' },
          membresia: { nombre: 'Anual' },
        },
      ])
      const r = await notificacionService.generarAlertas(3n)
      expect(r).toEqual({ generadas: 0 })
      expect(notificacionRepository.crearMuchas).not.toHaveBeenCalled()
    })
  })
})
