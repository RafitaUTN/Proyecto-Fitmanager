import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors'

const {
  prisma,
  transferenciaRepository,
  notificationFactory,
  notificacionService,
  obtenerObligacionesPendientesCliente,
  transaction,
  tx,
} = vi.hoisted(() => {
  const transactionClient = {
    usuario: { findFirst: vi.fn() },
    cliente: { findUnique: vi.fn(), update: vi.fn() },
    solicitudTransferencia: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    solicitudAuditoria: { create: vi.fn() },
    clienteMembresia: { updateMany: vi.fn() },
    clienteRutina: { updateMany: vi.fn() },
    asistencia: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  }
  return {
    prisma: { $transaction: vi.fn() },
    transferenciaRepository: {
      expirarVencidas: vi.fn(),
      expirarMasivamente: vi.fn(),
      crearAuditoria: vi.fn(),
      listar: vi.fn(),
      buscarPorId: vi.fn(),
      contarRecibidas: vi.fn(),
      contarEnviadas: vi.fn(),
    },
    notificationFactory: { crearMultiple: vi.fn() },
    notificacionService: { crear: vi.fn() },
    obtenerObligacionesPendientesCliente: vi.fn(),
    transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
      typeof callback === 'function' ? callback(transactionClient) : undefined,
    ),
    tx: transactionClient,
  }
})

vi.mock('../lib/prisma', () => ({ prisma }))
vi.mock('../repositories/transferencia.repository', () => ({ transferenciaRepository }))
vi.mock('./notification-factory.service', () => ({ notificationFactory }))
vi.mock('./notificacion.service', () => ({ notificacionService }))
vi.mock('./payment-balance', () => ({ obtenerObligacionesPendientesCliente }))

import { transferenciaService } from './transferencia.service'

const cliente = { id_cliente: 7n, id_gimnasio: 3n, nombre: 'Juan', apellido: 'Perez', estado: true }

describe('transferenciaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.$transaction = transaction
  })

  describe('listar', () => {
    it('lista sin expirar vencidas', async () => {
      transferenciaRepository.expirarVencidas.mockResolvedValue([])
      transferenciaRepository.listar.mockResolvedValue([{ id: 1n }])
      const r = await transferenciaService.listar(3n, 'PENDIENTE', 'Administrador')
      expect(r).toEqual([{ id: 1n }])
      expect(transferenciaRepository.expirarMasivamente).not.toHaveBeenCalled()
    })

    it('expira solicitudes vencidas y notifica + audita', async () => {
      const vencida = { id: 5n, id_gym_origen: 3n }
      transferenciaRepository.expirarVencidas.mockResolvedValue([vencida])
      transferenciaRepository.expirarMasivamente.mockResolvedValue({ count: 1 })
      transferenciaRepository.crearAuditoria.mockResolvedValue({})
      notificacionService.crear.mockResolvedValue({})
      transferenciaRepository.listar.mockResolvedValue([])

      await transferenciaService.listar(3n)
      expect(transferenciaRepository.expirarMasivamente).toHaveBeenCalledWith([5n])
      expect(notificacionService.crear).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Solicitud expirada' }))
      expect(transferenciaRepository.crearAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ id_solicitud: 5n, accion: 'EXPIRADA' }),
      )
    })
  })

  describe('buscar', () => {
    it('retorna la solicitud del gimnasio', async () => {
      transferenciaRepository.buscarPorId.mockResolvedValue({ id: 1n, id_gym_origen: 3n, id_gym_destino: 4n })
      const r = await transferenciaService.buscar(1n, 3n)
      expect(r).toEqual({ id: 1n, id_gym_origen: 3n, id_gym_destino: 4n })
    })

    it('rechaza solicitudes inexistentes y de otros gimnasios', async () => {
      transferenciaRepository.buscarPorId.mockResolvedValue(null)
      await expect(transferenciaService.buscar(1n, 3n)).rejects.toMatchObject({ statusCode: 404 })
      transferenciaRepository.buscarPorId.mockResolvedValue({ id: 1n, id_gym_origen: 3n, id_gym_destino: 4n })
      await expect(transferenciaService.buscar(1n, 99n)).rejects.toMatchObject({ statusCode: 403 })
    })
  })

  describe('crear', () => {
    const dto = { id_cliente: '7', motivo: 'Cambio de sede' }

    it('crea la solicitud con notificaciones y auditoria', async () => {
      tx.usuario.findFirst.mockResolvedValue({ id_usuario: 2n })
      tx.cliente.findUnique.mockResolvedValue(cliente)
      tx.solicitudTransferencia.findFirst.mockResolvedValue(null)
      tx.solicitudTransferencia.create.mockResolvedValue({ id: 1n, id_cliente: 7n })
      notificationFactory.crearMultiple.mockResolvedValue([{}, {}])

      const r = await transferenciaService.crear(4n, dto as any, 2)
      expect(r).toEqual({ id: 1n, id_cliente: 7n })
      expect(tx.solicitudTransferencia.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          id_cliente: 7n,
          id_gym_origen: 3n,
          id_gym_destino: 4n,
          id_usuario_solicita: 2n,
          motivo: 'Cambio de sede',
        }),
      }))
      expect(notificationFactory.crearMultiple).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ tipo: 'TRANSFERENCIA' })]),
        tx,
      )
      expect(tx.solicitudAuditoria.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ accion: 'CREADA', id_solicitud: 1n, estado_nuevo: 'PENDIENTE' }),
      }))
    })

    it('rechaza solicitante no autorizado', async () => {
      tx.usuario.findFirst.mockResolvedValue(null)
      await expect(transferenciaService.crear(4n, dto as any, 2)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('rechaza cliente inexistente', async () => {
      tx.usuario.findFirst.mockResolvedValue({ id_usuario: 2n })
      tx.cliente.findUnique.mockResolvedValue(null)
      await expect(transferenciaService.crear(4n, dto as any, 2)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza cliente que ya pertenece al gimnasio destino', async () => {
      tx.usuario.findFirst.mockResolvedValue({ id_usuario: 2n })
      tx.cliente.findUnique.mockResolvedValue({ ...cliente, id_gimnasio: 4n })
      await expect(transferenciaService.crear(4n, dto as any, 2)).rejects.toMatchObject({ statusCode: 400 })
    })

    it('rechaza duplicados pendientes', async () => {
      tx.usuario.findFirst.mockResolvedValue({ id_usuario: 2n })
      tx.cliente.findUnique.mockResolvedValue(cliente)
      tx.solicitudTransferencia.findFirst.mockResolvedValue({ id: 9n })
      await expect(transferenciaService.crear(4n, dto as any, 2)).rejects.toMatchObject({ statusCode: 409 })
    })

    it('mapea errores de unicidad a 409', async () => {
      tx.usuario.findFirst.mockResolvedValue({ id_usuario: 2n })
      tx.cliente.findUnique.mockResolvedValue(cliente)
      tx.solicitudTransferencia.findFirst.mockResolvedValue(null)
      tx.solicitudTransferencia.create.mockRejectedValue({ code: 'P2002' })
      await expect(transferenciaService.crear(4n, dto as any, 2)).rejects.toMatchObject({ statusCode: 409 })
    })
  })

  describe('aprobar', () => {
    const solicitud = {
      id: 1n,
      id_gym_origen: 3n,
      id_gym_destino: 4n,
      estado: 'PENDIENTE',
      id_cliente: 7n,
      cliente: { nombre: 'Juan', apellido: 'Perez', id_gimnasio: 3n },
    }

    function setupSolicitud() {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue(solicitud)
      obtenerObligacionesPendientesCliente.mockResolvedValue([])
      tx.asistencia.findFirst.mockResolvedValue(null)
      tx.clienteMembresia.updateMany.mockResolvedValue({ count: 1 })
      tx.clienteRutina.updateMany.mockResolvedValue({ count: 1 })
      tx.cliente.update.mockResolvedValue({})
      tx.solicitudTransferencia.update.mockResolvedValue({})
      notificationFactory.crearMultiple.mockResolvedValue([{}, {}])
      tx.solicitudAuditoria.create.mockResolvedValue({})
    }

    it('aprueba y mueve al cliente entre gimnasios', async () => {
      setupSolicitud()
      const r = await transferenciaService.aprobar(1n, 3n, 2, 'ok')
      expect(tx.clienteMembresia.updateMany).toHaveBeenCalledWith({
        where: { id_cliente: 7n, estado: 'activo' },
        data: { estado: 'cancelada' },
      })
      expect(tx.cliente.update).toHaveBeenCalledWith({
        where: { id_cliente: 7n, id_gimnasio: 3n },
        data: { id_gimnasio: 4n, id_entrenador: null, estado: true },
      })
      expect(tx.solicitudTransferencia.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ estado: 'APROBADA' }),
      }))
      expect(notificationFactory.crearMultiple).toHaveBeenCalled()
      expect(tx.solicitudAuditoria.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ accion: 'APROBADA', id_solicitud: 1n }),
      }))
      expect(r).toEqual(solicitud)
    })

    it('rechaza aprobar una solicitud inexistente', async () => {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue(null)
      await expect(transferenciaService.aprobar(1n, 3n, 2, 'ok')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza aprobar desde un gimnasio distinto al origen', async () => {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue(solicitud)
      await expect(transferenciaService.aprobar(1n, 99n, 2, 'ok')).rejects.toMatchObject({ statusCode: 403 })
    })

    it('rechaza aprobar solicitudes no pendientes', async () => {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue({ ...solicitud, estado: 'CANCELADA' })
      await expect(transferenciaService.aprobar(1n, 3n, 2, 'ok')).rejects.toMatchObject({ statusCode: 409 })
    })

    it('rechaza aprobar si el cliente cambio de tenant', async () => {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue({
        ...solicitud,
        cliente: { ...solicitud.cliente, id_gimnasio: 99n },
      })
      await expect(transferenciaService.aprobar(1n, 3n, 2, 'ok')).rejects.toMatchObject({
        statusCode: 409,
        codigo: 'CLIENTE_CAMBIO_TENANT',
      })
    })

    it('rechaza aprobar con pagos pendientes', async () => {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue(solicitud)
      obtenerObligacionesPendientesCliente.mockResolvedValue([{ saldo_pendiente: 15000 }])
      await expect(transferenciaService.aprobar(1n, 3n, 2, 'ok')).rejects.toMatchObject({
        statusCode: 400,
        codigo: 'PAGOS_PENDIENTES',
      })
    })

    it('rechaza aprobar con asistencia abierta', async () => {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue(solicitud)
      obtenerObligacionesPendientesCliente.mockResolvedValue([])
      tx.asistencia.findFirst.mockResolvedValue({ id_asistencia: 3n, fecha_hora_ingreso: new Date() })
      await expect(transferenciaService.aprobar(1n, 3n, 2, 'ok')).rejects.toMatchObject({
        statusCode: 409,
        codigo: 'TRANSFERENCIA_CON_ASISTENCIA_ABIERTA',
      })
    })
  })

  describe('rechazar', () => {
    const solicitud = { id: 1n, id_gym_origen: 3n, id_gym_destino: 4n, estado: 'PENDIENTE' }

    it('rechaza y notifica', async () => {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue(solicitud)
      tx.solicitudTransferencia.update.mockResolvedValue({ ...solicitud, estado: 'RECHAZADA' })
      notificationFactory.crearMultiple.mockResolvedValue([{}, {}])
      tx.solicitudAuditoria.create.mockResolvedValue({})

      const r = await transferenciaService.rechazar(1n, 3n, 2, 'motivo')
      expect(r).toEqual(solicitud)
      expect(tx.solicitudTransferencia.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({ estado: 'RECHAZADA', observaciones: 'motivo' }),
      }))
      expect(notificationFactory.crearMultiple).toHaveBeenCalled()
    })

    it('rechaza errores de permiso y estado', async () => {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue(solicitud)
      await expect(transferenciaService.rechazar(1n, 99n, 2, 'x')).rejects.toMatchObject({ statusCode: 403 })
      tx.solicitudTransferencia.findUnique.mockResolvedValue({ ...solicitud, estado: 'APROBADA' })
      await expect(transferenciaService.rechazar(1n, 3n, 2, 'x')).rejects.toMatchObject({ statusCode: 409 })
    })
  })

  describe('cancelar', () => {
    const solicitud = { id: 1n, id_gym_origen: 3n, id_gym_destino: 4n, estado: 'PENDIENTE' }

    it('cancela desde el gimnasio destino', async () => {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue(solicitud)
      tx.solicitudTransferencia.update.mockResolvedValue({ ...solicitud, estado: 'CANCELADA' })
      notificationFactory.crearMultiple.mockResolvedValue([{}, {}])
      tx.solicitudAuditoria.create.mockResolvedValue({})

      const r = await transferenciaService.cancelar(1n, 4n, 2)
      expect(r).toEqual(solicitud)
      expect(notificationFactory.crearMultiple).toHaveBeenCalled()
    })

    it('rechaza cancelar desde otro gimnasio', async () => {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue(solicitud)
      await expect(transferenciaService.cancelar(1n, 3n, 2)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('rechaza cancelar solicitudes no pendientes', async () => {
      tx.$queryRaw.mockResolvedValue([])
      tx.solicitudTransferencia.findUnique.mockResolvedValue({ ...solicitud, estado: 'APROBADA' })
      await expect(transferenciaService.cancelar(1n, 4n, 2)).rejects.toMatchObject({ statusCode: 409 })
    })
  })

  describe('indicadores', () => {
    it('retorna contadores recibidas y enviadas', async () => {
      transferenciaRepository.contarRecibidas.mockResolvedValue(2)
      transferenciaRepository.contarEnviadas.mockResolvedValue(1)
      const r = await transferenciaService.indicadores(3n)
      expect(r).toEqual({ recibidas: 2, enviadas: 1 })
    })
  })
})
