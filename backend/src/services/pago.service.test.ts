import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors'

const { prisma, pagoRepository, notificationFactory, obtenerResumenPago } = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  pagoRepository: { listarPorGimnasio: vi.fn(), crear: vi.fn() },
  notificationFactory: { crear: vi.fn(), crearMultiple: vi.fn() },
  obtenerResumenPago: vi.fn(),
}))

vi.mock('../lib/prisma', () => ({ prisma }))
vi.mock('../repositories/pago.repository', () => ({ pagoRepository }))
vi.mock('./notification-factory.service', () => ({ notificationFactory }))
vi.mock('./payment-balance', () => ({ obtenerResumenPago }))

import { pagoService } from './pago.service'

const resumen = (overrides: Record<string, unknown> = {}) => ({
  id_cliente: 5,
  id_cliente_membresia: 1,
  membresia: 'Premium',
  cliente: 'Juan Pérez',
  monto_total: 35000,
  monto_pagado: 0,
  saldo_pendiente: 35000,
  estado_pago: 'PENDIENTE',
  pago_habilitado: true,
  motivo_no_pagable: null,
  fecha_pago_habilitada: new Date('2026-08-31'),
  fecha_vencimiento_pago: new Date('2026-08-31'),
  ...overrides,
})

function transaction(fn: any, tx: Record<string, any>) {
  return prisma.$transaction.mockImplementation(async (cb: any) => cb(tx))
}

describe('pagoService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listar / resumen', () => {
    it('lista pagos por gimnasio sin filtro de cliente', async () => {
      pagoRepository.listarPorGimnasio.mockResolvedValue([{ id_pago: 1 }])
      await pagoService.listar(3n)
      expect(pagoRepository.listarPorGimnasio).toHaveBeenCalledWith(3n, undefined)
    })

    it('lista pagos filtrando por cliente', async () => {
      await pagoService.listar(3n, 7n)
      expect(pagoRepository.listarPorGimnasio).toHaveBeenCalledWith(3n, 7n)
    })

    it('delega el resumen al balance', async () => {
      obtenerResumenPago.mockResolvedValue({ saldo_pendiente: 0 })
      const r = await pagoService.resumen(3n, 9n)
      expect(obtenerResumenPago).toHaveBeenCalledWith(3n, 9n)
      expect(r).toEqual({ saldo_pendiente: 0 })
    })
  })

  describe('registrar', () => {
    const tx = { $queryRaw: vi.fn() }

    beforeEach(() => {
      tx.$queryRaw.mockResolvedValue([])
      transaction(prisma.$transaction, tx)
    })

    it('registra un pago parcial y notifica', async () => {
      obtenerResumenPago
        .mockResolvedValueOnce(resumen())
        .mockResolvedValueOnce(resumen({ monto_pagado: 10000, saldo_pendiente: 25000, estado_pago: 'PARCIAL' }))
      pagoRepository.crear.mockResolvedValue({ id_pago: 10n })

      const r = await pagoService.registrar(3n, {
        id_cliente: 5, id_cliente_membresia: 1, monto: 10000, metodo_pago: 'efectivo',
      })

      expect(pagoRepository.crear).toHaveBeenCalledWith(
        expect.objectContaining({ id_gimnasio: 3n, id_cliente: 5n, monto: 10000, estado: 'completado' }),
        tx,
      )
      expect(notificationFactory.crear).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Pago recibido' }),
        tx,
      )
      expect(r.resumen.estado_pago).toBe('PARCIAL')
    })

    it('marca completado y usa titulo de completado', async () => {
      obtenerResumenPago
        .mockResolvedValueOnce(resumen({ saldo_pendiente: 35000 }))
        .mockResolvedValueOnce(resumen({ monto_pagado: 35000, saldo_pendiente: 0, estado_pago: 'COMPLETADO' }))
      pagoRepository.crear.mockResolvedValue({ id_pago: 11n })

      await pagoService.registrar(3n, {
        id_cliente: 5, id_cliente_membresia: 1, monto: 35000, metodo_pago: 'tarjeta',
      })

      expect(notificationFactory.crear).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Pago completado', eventKey: 'pago:11:completado' }),
        tx,
      )
    })

    it('rechaza un pago de una membresia de otro cliente', async () => {
      obtenerResumenPago.mockResolvedValueOnce(resumen({ id_cliente: 99 }))
      await expect(pagoService.registrar(3n, {
        id_cliente: 5, id_cliente_membresia: 1, monto: 100, metodo_pago: 'efectivo',
      })).rejects.toMatchObject({ statusCode: 404, codigo: 'RESOURCE_NOT_ACCESSIBLE' })
    })

    it.each([
      ['MEMBRESIA_FUTURA', 'FUTURE_MEMBERSHIP'],
      ['MEMBRESIA_INACTIVA', 'MEMBERSHIP_NOT_PAYABLE'],
      ['SALDO_COMPLETADO', 'PAYMENT_ALREADY_COMPLETED'],
      ['VENTANA_NO_ABIERTA', 'PAYMENT_NOT_ALLOWED_YET'],
    ])('bloquea pagos no habilitados (%s -> %s)', async (motivo, codigo) => {
      obtenerResumenPago.mockResolvedValueOnce(resumen({ pago_habilitado: false, motivo_no_pagable: motivo }))
      await expect(pagoService.registrar(3n, {
        id_cliente: 5, id_cliente_membresia: 1, monto: 100, metodo_pago: 'efectivo',
      })).rejects.toMatchObject({ statusCode: 409, codigo })
    })

    it('rechaza montos que exceden el saldo', async () => {
      obtenerResumenPago.mockResolvedValueOnce(resumen({ saldo_pendiente: 35000 }))
      await expect(pagoService.registrar(3n, {
        id_cliente: 5, id_cliente_membresia: 1, monto: 99999, metodo_pago: 'efectivo',
      })).rejects.toMatchObject({ statusCode: 409, codigo: 'PAYMENT_EXCEEDS_BALANCE' })
    })

    it('usa el codigo numerico de id_cliente_membresia', async () => {
      obtenerResumenPago
        .mockResolvedValueOnce(resumen())
        .mockResolvedValueOnce(resumen({ estado_pago: 'COMPLETADO' }))
      pagoRepository.crear.mockResolvedValue({ id_pago: 12n })
      await pagoService.registrar(3n, {
        id_cliente: 5, id_cliente_membresia: 999, monto: 1, metodo_pago: 'efectivo',
      })
      expect(pagoRepository.crear).toHaveBeenCalledWith(
        expect.objectContaining({ id_cliente_membresia: 999n }),
        tx,
      )
    })
  })
})
