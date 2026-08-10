import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors'

const { prisma, tx, transaction, asistenciaRepository } = vi.hoisted(() => {
  const transactionClient = {
    cliente: { findFirst: vi.fn() },
    clienteMembresia: { findFirst: vi.fn() },
  }
  return {
    prisma: { $transaction: vi.fn() },
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
      const r = await asistenciaService.listar(3n, {
        fecha_inicio: '2026-08-01', fecha_fin: '2026-08-09', id_cliente: '7', solo_dentro: true, pagina: 2, limite: 10,
      } as any, 9n)

      expect(asistenciaRepository.listarPorGimnasio).toHaveBeenCalledWith(
        3n,
        expect.objectContaining({ id_cliente: 7n, solo_dentro: true, id_entrenador: 9n }),
        2, 10,
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

      expect(tx.cliente.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id_cliente: 7n, id_gimnasio: 3n, estado: true }),
      }))
      expect(tx.clienteMembresia.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id_cliente: 7n, estado: 'activo' }),
      }))
      expect(asistenciaRepository.crear).toHaveBeenCalledWith(
        expect.objectContaining({ id_gimnasio: 3n, id_cliente: 7n }),
        tx,
      )
      expect(r).toEqual({ id_asistencia: 5n })
    })

    it('rechaza cliente inexistente o inactivo', async () => {
      tx.cliente.findFirst.mockResolvedValue(null)
      await expect(asistenciaService.registrarEntrada(3n, { id_cliente: 7 } as any))
        .rejects.toMatchObject({ statusCode: 404 })
    })

    it('rechaza sin membresia vigente', async () => {
      tx.cliente.findFirst.mockResolvedValue({ id_cliente: 7n })
      tx.clienteMembresia.findFirst.mockResolvedValue(null)
      await expect(asistenciaService.registrarEntrada(3n, { id_cliente: 7 } as any))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('rechaza doble entrada ya detectada', async () => {
      tx.cliente.findFirst.mockResolvedValue({ id_cliente: 7n })
      tx.clienteMembresia.findFirst.mockResolvedValue({ id_cliente_membresia: 1n })
      asistenciaRepository.buscarEntradaAbierta.mockResolvedValue({ id_asistencia: 1 })
      await expect(asistenciaService.registrarEntrada(3n, { id_cliente: 7 } as any))
        .rejects.toMatchObject({ statusCode: 409 })
    })

    it('convierte P2002 en doble entrada', async () => {
      tx.cliente.findFirst.mockResolvedValue({ id_cliente: 7n })
      tx.clienteMembresia.findFirst.mockResolvedValue({ id_cliente_membresia: 1n })
      asistenciaRepository.buscarEntradaAbierta.mockResolvedValue(null)
      asistenciaRepository.crear.mockRejectedValue({ code: 'P2002' })
      await expect(asistenciaService.registrarEntrada(3n, { id_cliente: 7 } as any))
        .rejects.toMatchObject({ statusCode: 409 })
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
      await expect(asistenciaService.registrarSalida(3n, { id_asistencia: 5 } as any))
        .rejects.toMatchObject({ statusCode: 404, codigo: 'RESOURCE_NOT_ACCESSIBLE' })
    })

    it('rechaza salida doble', async () => {
      asistenciaRepository.buscarPorId.mockResolvedValueOnce({ id_asistencia: 5n, fecha_hora_salida: new Date() })
      await expect(asistenciaService.registrarSalida(3n, { id_asistencia: 5 } as any))
        .rejects.toMatchObject({ statusCode: 409, codigo: 'ATTENDANCE_ALREADY_CLOSED' })
    })

    it('protege contra doble cierre concurrente con updateMany', async () => {
      asistenciaRepository.buscarPorId.mockResolvedValueOnce({ id_asistencia: 5n, fecha_hora_salida: null })
      asistenciaRepository.actualizarSalidaSiAbierta.mockResolvedValue({ count: 0 })
      await expect(asistenciaService.registrarSalida(3n, { id_asistencia: 5 } as any))
        .rejects.toBeInstanceOf(AppError)
    })
  })

  describe('listarActivas / listarHoy', () => {
    it('delega listarActivas', async () => {
      asistenciaRepository.listarActivas.mockResolvedValue([{ id_asistencia: 1 }])
      await asistenciaService.listarActivas(3n)
      expect(asistenciaRepository.listarActivas).toHaveBeenCalledWith(3n)
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
