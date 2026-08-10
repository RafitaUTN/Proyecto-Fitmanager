import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors'

const { prisma, tx, transaction, clienteMembresiaRepository, clienteRepository, notificationFactory, obtenerResumenPago } = vi.hoisted(() => {
  const transactionClient = {
    cliente: { findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
    membresia: { findFirst: vi.fn() },
    usuario: { findUnique: vi.fn() },
    notificacion: { create: vi.fn() },
    $queryRaw: vi.fn(),
  }
  return {
    prisma: {
      $transaction: vi.fn(),
      cliente: { findUnique: vi.fn() },
      clienteMembresia: { findMany: vi.fn() },
    },
    tx: transactionClient,
    transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
      typeof callback === 'function' ? callback(transactionClient) : undefined,
    ),
    clienteMembresiaRepository: {
      listarPorCliente: vi.fn(),
      listarPorGimnasio: vi.fn(),
      listarRecientes: vi.fn(),
      listarActivaPorCliente: vi.fn(),
      crear: vi.fn(),
      buscarPorId: vi.fn(),
      actualizarEstado: vi.fn(),
      extender: vi.fn(),
    },
    clienteRepository: { buscarPorId: vi.fn() },
    notificationFactory: { crear: vi.fn(), crearMultiple: vi.fn() },
    obtenerResumenPago: vi.fn(),
  }
})

vi.mock('../lib/prisma', () => ({ prisma }))
vi.mock('../repositories/cliente-membresia.repository', () => ({ clienteMembresiaRepository }))
vi.mock('../repositories/cliente.repository', () => ({ clienteRepository }))
vi.mock('./notification-factory.service', () => ({ notificationFactory }))
vi.mock('./payment-balance', () => ({ obtenerResumenPago }))

import { clienteMembresiaService } from './cliente-membresia.service'

const cliente = { id_cliente: 7n, id_gimnasio: 3n, estado: true, nombre: 'Juan', apellido: 'Pérez' }
const membresia = { id_membresia: 2n, id_gimnasio: 3n, estado: true, nombre: 'Premium', precio: 35000, duracion_dias: 30 }

describe('clienteMembresiaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.$transaction = transaction
  })

  describe('listarPorCliente', () => {
    it('lista membresias del cliente del mismo gimnasio', async () => {
      clienteRepository.buscarPorId.mockResolvedValue(cliente)
      clienteMembresiaRepository.listarPorCliente.mockResolvedValue([{ id_cliente_membresia: 1 }])
      const r = await clienteMembresiaService.listarPorCliente(7n, 3n)
      expect(clienteMembresiaRepository.listarPorCliente).toHaveBeenCalledWith(7n)
      expect(r).toEqual([{ id_cliente_membresia: 1 }])
    })

    it('rechaza cliente de otro gimnasio', async () => {
      clienteRepository.buscarPorId.mockResolvedValue({ ...cliente, id_gimnasio: 999n })
      await expect(clienteMembresiaService.listarPorCliente(7n, 3n)).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  it('listarTodas y listarRecientes delegan en el repositorio', async () => {
    clienteMembresiaRepository.listarPorGimnasio.mockResolvedValue([])
    clienteMembresiaRepository.listarRecientes.mockResolvedValue([])
    await clienteMembresiaService.listarTodas(3n)
    await clienteMembresiaService.listarRecientes(3n)
    expect(clienteMembresiaRepository.listarPorGimnasio).toHaveBeenCalledWith(3n)
    expect(clienteMembresiaRepository.listarRecientes).toHaveBeenCalledWith(3n, 15)
  })

  describe('asignar', () => {
    beforeEach(() => {
      tx.cliente.findFirst.mockResolvedValue(cliente)
      tx.membresia.findFirst.mockResolvedValue(membresia)
      clienteMembresiaRepository.listarActivaPorCliente.mockResolvedValue(null)
      clienteMembresiaRepository.crear.mockResolvedValue({ id_cliente_membresia: 1n })
    })

    it('asigna sin entrenador y calcula fecha de fin', async () => {
      const r = await clienteMembresiaService.asignar(3n, {
        id_cliente: 7, id_membresia: 2, fecha_inicio: '2026-08-09',
      })
      const data = clienteMembresiaRepository.crear.mock.calls[0][0]
      expect(data.monto_adeudado).toBe(35000)
      expect(data.estado).toBe('activo')
      expect(data.fecha_fin.getTime() - data.fecha_inicio.getTime()).toBe(30 * 24 * 3600 * 1000)
      expect(r).toEqual({ id_cliente_membresia: 1n })
      expect(notificationFactory.crear).not.toHaveBeenCalled()
    })

    it('asigna con entrenador disponible y notifica a ambos', async () => {
      tx.usuario.findUnique.mockResolvedValue({ id_usuario: 9n, id_gimnasio: 3n, rol: 'Entrenador', estado: true, nombre: 'Sam', apellido: 'Vargas', capacidad_max: 10 })
      tx.cliente.count.mockResolvedValue(5)
      tx.cliente.update.mockResolvedValue(cliente)

      await clienteMembresiaService.asignar(3n, {
        id_cliente: 7, id_membresia: 2, id_entrenador: 9, fecha_inicio: '2026-08-09',
      })

      expect(tx.cliente.update).toHaveBeenCalledWith({ where: { id_cliente: 7n }, data: { id_entrenador: 9n } })
      expect(tx.notificacion.create).toHaveBeenCalledTimes(2)
    })

    it('adquiere lock FOR UPDATE del entrenador antes de validar capacidad', async () => {
      tx.usuario.findUnique.mockResolvedValue({ id_usuario: 9n, id_gimnasio: 3n, rol: 'Entrenador', estado: true, nombre: 'Sam', apellido: 'Vargas', capacidad_max: 10 })
      tx.cliente.count.mockResolvedValue(5)
      tx.$queryRaw.mockClear()

      await clienteMembresiaService.asignar(3n, {
        id_cliente: 7, id_membresia: 2, id_entrenador: 9, fecha_inicio: '2026-08-09',
      })

      expect(tx.$queryRaw).toHaveBeenCalledTimes(1)
      const [sql] = tx.$queryRaw.mock.calls[0]
      expect(String(sql)).toContain('FOR UPDATE')
      expect(String(sql)).toContain('usuario')
    })

    it('rechaza cliente inexistente o de otro gimnasio', async () => {
      tx.cliente.findFirst.mockResolvedValue(null)
      await expect(clienteMembresiaService.asignar(3n, { id_cliente: 7, id_membresia: 2, fecha_inicio: '2026-08-09' }))
        .rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza membresia invalida', async () => {
      tx.membresia.findFirst.mockResolvedValue(null)
      await expect(clienteMembresiaService.asignar(3n, { id_cliente: 7, id_membresia: 2, fecha_inicio: '2026-08-09' }))
        .rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza cliente con membresia activa', async () => {
      clienteMembresiaRepository.listarActivaPorCliente.mockResolvedValue({ id_cliente_membresia: 1 })
      await expect(clienteMembresiaService.asignar(3n, { id_cliente: 7, id_membresia: 2, fecha_inicio: '2026-08-09' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('rechaza entrenador de otro gimnasio', async () => {
      tx.usuario.findUnique.mockResolvedValue({ id_usuario: 9n, id_gimnasio: 999n, rol: 'Entrenador', estado: true })
      await expect(clienteMembresiaService.asignar(3n, { id_cliente: 7, id_membresia: 2, id_entrenador: 9, fecha_inicio: '2026-08-09' }))
        .rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza entrenador no disponible', async () => {
      tx.usuario.findUnique.mockResolvedValue({ id_usuario: 9n, id_gimnasio: 3n, rol: 'Entrenador', estado: false })
      await expect(clienteMembresiaService.asignar(3n, { id_cliente: 7, id_membresia: 2, id_entrenador: 9, fecha_inicio: '2026-08-09' }))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('rechaza entrenador con capacidad llena', async () => {
      tx.usuario.findUnique.mockResolvedValue({ id_usuario: 9n, id_gimnasio: 3n, rol: 'Entrenador', estado: true, nombre: 'Sam', apellido: 'Vargas', capacidad_max: 5 })
      tx.cliente.count.mockResolvedValue(5)
      await expect(clienteMembresiaService.asignar(3n, { id_cliente: 7, id_membresia: 2, id_entrenador: 9, fecha_inicio: '2026-08-09' }))
        .rejects.toMatchObject({ statusCode: 409 })
    })
  })

  describe('cancelar', () => {
    it('cancela y notifica al cliente y administracion', async () => {
      clienteMembresiaRepository.buscarPorId.mockResolvedValue({ id_cliente_membresia: 1n, estado: 'activo', id_cliente: 7n })
      tx.cliente.findFirst.mockResolvedValue(cliente)
      clienteMembresiaRepository.actualizarEstado.mockResolvedValue({ id_cliente_membresia: 1n, estado: 'cancelada' })

      const r = await clienteMembresiaService.cancelar(1n, 3n)

      expect(clienteMembresiaRepository.actualizarEstado).toHaveBeenCalledWith(1n, 'cancelada', tx)
      expect(notificationFactory.crearMultiple).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ destino: { id_cliente: 7n } })]),
        tx,
      )
      expect(r.estado).toBe('cancelada')
    })

    it('rechaza asignacion inexistente', async () => {
      clienteMembresiaRepository.buscarPorId.mockResolvedValue(null)
      await expect(clienteMembresiaService.cancelar(1n, 3n)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza membresia no activa', async () => {
      clienteMembresiaRepository.buscarPorId.mockResolvedValue({ id_cliente_membresia: 1n, estado: 'cancelada', id_cliente: 7n })
      await expect(clienteMembresiaService.cancelar(1n, 3n)).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  describe('consultarEstado', () => {
    it('rechaza cliente de otro gimnasio', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ ...cliente, id_gimnasio: 999n })
      await expect(clienteMembresiaService.consultarEstado(7n, 3n)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('arma membresia activa y vencida con historial', async () => {
      const hoy = new Date()
      const enCurso = { id_cliente_membresia: 1n, id_membresia: 2n, estado: 'activo', fecha_inicio: new Date(hoy.getTime() - 86400000), fecha_fin: new Date(hoy.getTime() + 29 * 86400000), membresia: { nombre: 'Premium', precio: 35000, duracion_dias: 30 } }
      const vencida = { id_cliente_membresia: 2n, id_membresia: 2n, estado: 'activo', fecha_inicio: new Date('2026-01-01'), fecha_fin: new Date('2026-01-31'), membresia: { nombre: 'Premium', precio: 35000, duracion_dias: 30 } }
      prisma.cliente.findUnique.mockResolvedValue({ ...cliente, entrenador: null })
      clienteMembresiaRepository.listarPorCliente.mockResolvedValue([enCurso, vencida])
      prisma.clienteMembresia.findMany.mockResolvedValue([enCurso, vencida])

      const r = await clienteMembresiaService.consultarEstado(7n, 3n)

      expect(r.membresiaActiva!.id).toBe(1n)
      expect(r.membresiaVencida!.id).toBe(2n)
      expect(r.historial).toHaveLength(2)
      expect(r.cliente.entrenador).toBeNull()
    })
  })

  describe('cambiarPlan', () => {
    it('cancela la activa anterior y crea el nuevo plan', async () => {
      tx.cliente.findFirst.mockResolvedValue(cliente)
      tx.membresia.findFirst.mockResolvedValue({ ...membresia, precio: 50000, duracion_dias: 90 })
      clienteMembresiaRepository.listarActivaPorCliente.mockResolvedValue({ id_cliente_membresia: 1n })
      clienteMembresiaRepository.actualizarEstado.mockResolvedValue({})
      clienteMembresiaRepository.crear.mockResolvedValue({ id_cliente_membresia: 3n })

      const r = await clienteMembresiaService.cambiarPlan(7n, 3n, { id_membresia: 2n })

      expect(clienteMembresiaRepository.actualizarEstado).toHaveBeenCalledWith(1n, 'cancelada', tx)
      expect(clienteMembresiaRepository.crear.mock.calls[0][0].monto_adeudado).toBe(50000)
      expect(notificationFactory.crearMultiple).toHaveBeenCalledTimes(1)
      expect(r).toEqual({ id_cliente_membresia: 3n })
    })

    it('rechaza cliente inexistente', async () => {
      tx.cliente.findFirst.mockResolvedValue(null)
      await expect(clienteMembresiaService.cambiarPlan(7n, 3n, { id_membresia: 2n })).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza cliente inactivo', async () => {
      tx.cliente.findFirst.mockResolvedValue({ ...cliente, estado: false })
      await expect(clienteMembresiaService.cambiarPlan(7n, 3n, { id_membresia: 2n })).rejects.toMatchObject({ statusCode: 400 })
    })

    it('rechaza plan invalido', async () => {
      tx.cliente.findFirst.mockResolvedValue(cliente)
      tx.membresia.findFirst.mockResolvedValue(null)
      await expect(clienteMembresiaService.cambiarPlan(7n, 3n, { id_membresia: 2n })).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('renovar', () => {
    beforeEach(() => {
      tx.$queryRaw.mockResolvedValue([])
    })

    it('renueva extendiendo la fecha y suma el precio', async () => {
      const base = { id_cliente_membresia: 1n, estado: 'activo', id_membresia: 2n, id_cliente: 7n, monto_adeudado: 35000, fecha_fin: new Date('2026-08-31') }
      clienteMembresiaRepository.buscarPorId.mockResolvedValue(base)
      tx.membresia.findFirst.mockResolvedValue(membresia)
      tx.cliente.findFirst.mockResolvedValue(cliente)
      obtenerResumenPago.mockResolvedValue({ saldo_pendiente: 0 })
      clienteMembresiaRepository.extender.mockResolvedValue({ id_cliente_membresia: 1n })

      await clienteMembresiaService.renovar(1n, 3n)

      const ext = clienteMembresiaRepository.extender.mock.calls[0][1]
      expect(ext.monto_adeudado).toBe(70000)
      expect(ext.fecha_vencimiento_pago).toEqual(ext.fecha_fin)
      expect(notificationFactory.crearMultiple).toHaveBeenCalledTimes(1)
    })

    it('rechaza asignacion inexistente', async () => {
      clienteMembresiaRepository.buscarPorId.mockResolvedValue(null)
      await expect(clienteMembresiaService.renovar(1n, 3n)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza membresia no activa', async () => {
      clienteMembresiaRepository.buscarPorId.mockResolvedValue({ id_cliente_membresia: 1n, estado: 'cancelada' })
      await expect(clienteMembresiaService.renovar(1n, 3n)).rejects.toMatchObject({ statusCode: 400 })
    })

    it('rechaza renovar con pagos pendientes', async () => {
      clienteMembresiaRepository.buscarPorId.mockResolvedValue({ id_cliente_membresia: 1n, estado: 'activo', id_membresia: 2n, id_cliente: 7n, monto_adeudado: 35000, fecha_fin: new Date('2026-08-31') })
      tx.membresia.findFirst.mockResolvedValue(membresia)
      tx.cliente.findFirst.mockResolvedValue(cliente)
      obtenerResumenPago.mockResolvedValue({ saldo_pendiente: 25000 })
      await expect(clienteMembresiaService.renovar(1n, 3n)).rejects.toMatchObject({ codigo: 'PAGOS_PENDIENTES' })
    })
  })
})
