/**
 * Pruebas automatizadas para validar el comportamiento de asistencia.service.test.
 *
 * @remarks Documenta escenarios esperados, errores controlados y regresiones del módulo relacionado.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors'

const { prisma, tx, transaction, asistenciaRepository } = vi.hoisted(() => {
  const transactionClient = {
    cliente: { findFirst: vi.fn() },
    clienteMembresia: { findFirst: vi.fn() },
  }
  return {
    prisma: { $transaction: vi.fn(), programacionRutina: { findMany: vi.fn() } },
    tx: transactionClient,
    transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
      typeof callback === 'function' ? callback(transactionClient) : undefined,
    ),
    asistenciaRepository: {
      listarPorGimnasio: vi.fn(),
      contarPorGimnasio: vi.fn(),
      buscarEntradaAbierta: vi.fn(),
      crear: vi.fn(),
      buscarPorId: vi.fn(),
      actualizarSalidaSiAbierta: vi.fn(),
      listarActivas: vi.fn(),
      listarElegibles: vi.fn(),
    },
  }
})

vi.mock('../lib/prisma', () => ({ prisma }))
vi.mock('../repositories/asistencia.repository', () => ({ asistenciaRepository }))

import { asistenciaService } from './asistencia.service'

describe('asistenciaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.$transaction = transaction
  })

  describe('listar', () => {
    it('normaliza fechas y devuelve paginacion', async () => {
      asistenciaRepository.listarPorGimnasio.mockResolvedValue([{ id_asistencia: 1 }])
      asistenciaRepository.contarPorGimnasio.mockResolvedValue(25)
      const r = await asistenciaService.listar(
        3n,
        {
          fecha_inicio: '2026-08-01',
          fecha_fin: '2026-08-09',
          id_cliente: '7',
          solo_dentro: true,
          pagina: 2,
          limite: 10,
        } as any,
        9n,
      )

      expect(asistenciaRepository.listarPorGimnasio).toHaveBeenCalledWith(
        3n,
        expect.objectContaining({ id_cliente: 7n, solo_dentro: true, id_entrenador: 9n }),
        2,
        10,
      )
      const filtro = asistenciaRepository.listarPorGimnasio.mock.calls[0][1]
      expect(filtro.fecha_inicio.getHours()).toBe(0)
      expect(filtro.fecha_fin.getHours()).toBe(23)
      expect(r).toMatchObject({ data: [{ id_asistencia: 1 }], total: 25, pagina: 2, totalPaginas: 3 })
    })

    it('omite fechas y cliente cuando no se filtran', async () => {
      asistenciaRepository.listarPorGimnasio.mockResolvedValue([])
      asistenciaRepository.contarPorGimnasio.mockResolvedValue(0)
      await asistenciaService.listar(3n, { pagina: 1, limite: 10 } as any)
      const filtro = asistenciaRepository.listarPorGimnasio.mock.calls[0][1]
      expect(filtro.fecha_inicio).toBeUndefined()
      expect(filtro.id_cliente).toBeUndefined()
    })
  })

  describe('registrarEntrada', () => {
    it('registra entrada valida', async () => {
      tx.cliente.findFirst.mockResolvedValue({ id_cliente: 7n })
      tx.clienteMembresia.findFirst.mockResolvedValue({ id_cliente_membresia: 1n })
      asistenciaRepository.buscarEntradaAbierta.mockResolvedValue(null)
      asistenciaRepository.crear.mockResolvedValue({ id_asistencia: 5n })

      const r = await asistenciaService.registrarEntrada(3n, { id_cliente: 7 } as any)

      expect(tx.cliente.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id_cliente: 7n, id_gimnasio: 3n, estado: true }),
        }),
      )
      expect(tx.clienteMembresia.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id_cliente: 7n, estado: 'activo' }),
        }),
      )
      expect(asistenciaRepository.crear).toHaveBeenCalledWith(
        expect.objectContaining({ id_gimnasio: 3n, id_cliente: 7n }),
        tx,
      )
      expect(r).toEqual({ id_asistencia: 5n })
    })

    it('rechaza cliente inexistente o inactivo', async () => {
      tx.cliente.findFirst.mockResolvedValue(null)
      await expect(asistenciaService.registrarEntrada(3n, { id_cliente: 7 } as any)).rejects.toMatchObject({
        statusCode: 404,
      })
    })

    it('rechaza sin membresia vigente', async () => {
      tx.cliente.findFirst.mockResolvedValue({ id_cliente: 7n })
      tx.clienteMembresia.findFirst.mockResolvedValue(null)
      await expect(asistenciaService.registrarEntrada(3n, { id_cliente: 7 } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('rechaza doble entrada ya detectada', async () => {
      tx.cliente.findFirst.mockResolvedValue({ id_cliente: 7n })
      tx.clienteMembresia.findFirst.mockResolvedValue({ id_cliente_membresia: 1n })
      asistenciaRepository.buscarEntradaAbierta.mockResolvedValue({ id_asistencia: 1 })
      await expect(asistenciaService.registrarEntrada(3n, { id_cliente: 7 } as any)).rejects.toMatchObject({
        statusCode: 409,
      })
    })

    it('convierte P2002 en doble entrada', async () => {
      tx.cliente.findFirst.mockResolvedValue({ id_cliente: 7n })
      tx.clienteMembresia.findFirst.mockResolvedValue({ id_cliente_membresia: 1n })
      asistenciaRepository.buscarEntradaAbierta.mockResolvedValue(null)
      asistenciaRepository.crear.mockRejectedValue({ code: 'P2002' })
      await expect(asistenciaService.registrarEntrada(3n, { id_cliente: 7 } as any)).rejects.toMatchObject({
        statusCode: 409,
      })
    })

    it('propaga el origen CLIENTE al crear el registro', async () => {
      tx.cliente.findFirst.mockResolvedValue({ id_cliente: 7n })
      tx.clienteMembresia.findFirst.mockResolvedValue({ id_cliente_membresia: 1n })
      asistenciaRepository.buscarEntradaAbierta.mockResolvedValue(null)
      asistenciaRepository.crear.mockResolvedValue({ id_asistencia: 5n })

      await asistenciaService.registrarEntrada(3n, { id_cliente: 7 } as any, 'CLIENTE')

      expect(asistenciaRepository.crear).toHaveBeenCalledWith(
        expect.objectContaining({ id_gimnasio: 3n, id_cliente: 7n, origen: 'CLIENTE' }),
        tx,
      )
    })
  })

  describe('metodos Cliente (portal)', () => {
    const ctxCliente = { actorType: 'CLIENTE', actorId: 7n, gymId: 3n, role: 'Cliente' } as any
    const ctxStaff = { actorType: 'STAFF', actorId: 8n, gymId: 3n, role: 'Administrador' } as any

    it('rechaza actores que no son clientes', async () => {
      await expect(asistenciaService.registrarEntradaCliente(ctxStaff)).rejects.toMatchObject({
        statusCode: 403,
        codigo: 'FORBIDDEN',
      })
      await expect(asistenciaService.asistenciaActualCliente(ctxStaff)).rejects.toMatchObject({
        statusCode: 403,
        codigo: 'FORBIDDEN',
      })
      await expect(asistenciaService.registrarSalidaCliente(ctxStaff)).rejects.toMatchObject({
        statusCode: 403,
        codigo: 'FORBIDDEN',
      })
    })

    it('registrarEntradaCliente delega con id del actor y origen CLIENTE', async () => {
      tx.cliente.findFirst.mockResolvedValue({ id_cliente: 7n })
      tx.clienteMembresia.findFirst.mockResolvedValue({ id_cliente_membresia: 1n })
      asistenciaRepository.buscarEntradaAbierta.mockResolvedValue(null)
      asistenciaRepository.crear.mockResolvedValue({ id_asistencia: 5n })

      const r = await asistenciaService.registrarEntradaCliente(ctxCliente)

      expect(asistenciaRepository.crear).toHaveBeenCalledWith(
        expect.objectContaining({ id_cliente: 7n, origen: 'CLIENTE' }),
        tx,
      )
      expect(r).toEqual({ id_asistencia: 5n })
    })

    it('asistenciaActualCliente devuelve la entrada abierta del actor', async () => {
      asistenciaRepository.buscarEntradaAbierta.mockResolvedValue({ id_asistencia: 9n })
      const r = await asistenciaService.asistenciaActualCliente(ctxCliente)
      expect(asistenciaRepository.buscarEntradaAbierta).toHaveBeenCalledWith(7n, 3n)
      expect(r).toEqual({ id_asistencia: 9n })
    })

    it('registrarSalidaCliente lanza ATTENDANCE_NOT_OPEN sin entrada abierta', async () => {
      asistenciaRepository.buscarEntradaAbierta.mockResolvedValue(null)
      await expect(asistenciaService.registrarSalidaCliente(ctxCliente)).rejects.toMatchObject({
        statusCode: 409,
        codigo: 'ATTENDANCE_NOT_OPEN',
      })
    })

    it('registrarSalidaCliente cierra la entrada abierta del actor', async () => {
      asistenciaRepository.buscarEntradaAbierta.mockResolvedValue({ id_asistencia: 9n })
      asistenciaRepository.buscarPorId
        .mockResolvedValueOnce({ id_asistencia: 9n, fecha_hora_salida: null })
        .mockResolvedValueOnce({ id_asistencia: 9n, fecha_hora_salida: new Date() })
      asistenciaRepository.actualizarSalidaSiAbierta.mockResolvedValue({ count: 1 })

      const r = await asistenciaService.registrarSalidaCliente(ctxCliente)

      expect(asistenciaRepository.actualizarSalidaSiAbierta).toHaveBeenCalledWith(9n, 3n, expect.any(Date), tx)
      expect(r!.fecha_hora_salida).toBeInstanceOf(Date)
    })
  })

  describe('registrarSalida', () => {
    it('cierra una entrada abierta', async () => {
      asistenciaRepository.buscarPorId
        .mockResolvedValueOnce({ id_asistencia: 5n, fecha_hora_salida: null })
        .mockResolvedValueOnce({ id_asistencia: 5n, fecha_hora_salida: new Date() })
      asistenciaRepository.actualizarSalidaSiAbierta.mockResolvedValue({ count: 1 })

      const r = await asistenciaService.registrarSalida(3n, { id_asistencia: 5 } as any)

      expect(asistenciaRepository.actualizarSalidaSiAbierta).toHaveBeenCalledWith(5n, 3n, expect.any(Date), tx)
      expect(r!.fecha_hora_salida).toBeInstanceOf(Date)
    })

    it('rechaza una asistencia inexistente o de otro gimnasio', async () => {
      asistenciaRepository.buscarPorId.mockResolvedValue(null)
      await expect(asistenciaService.registrarSalida(3n, { id_asistencia: 5 } as any)).rejects.toMatchObject({
        statusCode: 404,
        codigo: 'RESOURCE_NOT_ACCESSIBLE',
      })
    })

    it('rechaza salida doble', async () => {
      asistenciaRepository.buscarPorId.mockResolvedValueOnce({ id_asistencia: 5n, fecha_hora_salida: new Date() })
      await expect(asistenciaService.registrarSalida(3n, { id_asistencia: 5 } as any)).rejects.toMatchObject({
        statusCode: 409,
        codigo: 'ATTENDANCE_ALREADY_CLOSED',
      })
    })

    it('protege contra doble cierre concurrente con updateMany', async () => {
      asistenciaRepository.buscarPorId.mockResolvedValueOnce({ id_asistencia: 5n, fecha_hora_salida: null })
      asistenciaRepository.actualizarSalidaSiAbierta.mockResolvedValue({ count: 0 })
      await expect(asistenciaService.registrarSalida(3n, { id_asistencia: 5 } as any)).rejects.toBeInstanceOf(AppError)
    })
  })

  describe('listarActivas / listarHoy', () => {
    it('delega listarActivas', async () => {
      asistenciaRepository.listarActivas.mockResolvedValue([{ id_asistencia: 1 }])
      await asistenciaService.listarActivas(3n)
      expect(asistenciaRepository.listarActivas).toHaveBeenCalledWith(3n)
    })

    it('enriquece la asistencia con la rutina programada del dia (match por nivel)', async () => {
      asistenciaRepository.listarActivas.mockResolvedValue([
        {
          id_asistencia: 10n,
          cliente: { id_cliente: 7n, nombre: 'Juan', apellido: 'Perez', cedula: '1', telefono: '1', nivel: 'INTERMEDIO' },
        },
      ])
      prisma.programacionRutina.findMany.mockResolvedValue([
        {
          id_programacion: 3n,
          estado: 'EN_CURSO',
          hora_inicio: new Date(),
          hora_fin: new Date(Date.now() + 3_600_000),
          rutina: { id_rutina: 1n, nombre: 'Full Body' },
          entrenador: { id_usuario: 5n, nombre: 'Sofia', apellido: 'Vargas' },
          clientes: [],
          niveles: [{ nivel: 'INTERMEDIO' }],
        },
      ])

      const [r] = await asistenciaService.listarActivas(3n)

      expect(prisma.programacionRutina.findMany).toHaveBeenCalled()
      expect(prisma.programacionRutina.findMany.mock.calls[0][0]).toMatchObject({
        where: {
          id_gimnasio: 3n,
          estado: { in: ['PROGRAMADA', 'EN_CURSO'] },
        },
      })
      expect(r.rutina_programada).toMatchObject({ id_programacion: 3n, nombre: 'Full Body', estado: 'EN_CURSO' })
    })

    it('enriquece por asignacion directa aunque el nivel no coincida', async () => {
      asistenciaRepository.listarActivas.mockResolvedValue([
        {
          id_asistencia: 11n,
          cliente: { id_cliente: 7n, nombre: 'Juan', apellido: 'Perez', cedula: '1', telefono: '1', nivel: 'PRINCIPIANTE' },
        },
      ])
      prisma.programacionRutina.findMany.mockResolvedValue([
        {
          id_programacion: 4n,
          estado: 'PROGRAMADA',
          hora_inicio: new Date(),
          hora_fin: new Date(Date.now() + 3_600_000),
          rutina: { id_rutina: 2n, nombre: 'Fuerza' },
          entrenador: { id_usuario: 5n, nombre: 'Sofia', apellido: 'Vargas' },
          clientes: [{ id_cliente: 7n }],
          niveles: [{ nivel: 'AVANZADO' }],
        },
      ])

      const [r] = await asistenciaService.listarActivas(3n)

      expect(r.rutina_programada).toMatchObject({ id_programacion: 4n, nombre: 'Fuerza' })
    })

    it('deja rutina_programada en null cuando no hay sesion aplicable', async () => {
      asistenciaRepository.listarActivas.mockResolvedValue([
        {
          id_asistencia: 12n,
          cliente: { id_cliente: 7n, nombre: 'Juan', apellido: 'Perez', cedula: '1', telefono: '1', nivel: 'PRINCIPIANTE' },
        },
      ])
      prisma.programacionRutina.findMany.mockResolvedValue([
        {
          id_programacion: 5n,
          estado: 'EN_CURSO',
          hora_inicio: new Date(),
          hora_fin: new Date(Date.now() + 3_600_000),
          rutina: { id_rutina: 3n, nombre: 'Pilates' },
          entrenador: { id_usuario: 5n, nombre: 'Sofia', apellido: 'Vargas' },
          clientes: [],
          niveles: [{ nivel: 'EXPERTOS' }],
        },
      ])

      const [r] = await asistenciaService.listarActivas(3n)

      expect(r.rutina_programada).toBeNull()
    })

    it('delega listarElegibles', async () => {
      asistenciaRepository.listarElegibles.mockResolvedValue([{ id_cliente: 1n }])
      await asistenciaService.listarElegibles(3n)
      expect(asistenciaRepository.listarElegibles).toHaveBeenCalledWith(3n)
    })

    it('lista hoy con rango del dia', async () => {
      asistenciaRepository.listarPorGimnasio.mockResolvedValue([])
      await asistenciaService.listarHoy(3n)
      const filtro = asistenciaRepository.listarPorGimnasio.mock.calls[0][1]
      expect(filtro.fecha_inicio.getHours()).toBe(0)
      expect(filtro.fecha_fin.getHours()).toBe(23)
      expect(asistenciaRepository.listarPorGimnasio).toHaveBeenCalledWith(3n, filtro, 1, 200)
    })
  })
})
