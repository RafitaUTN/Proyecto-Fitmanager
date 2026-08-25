import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors'

const { prisma, pagoRepository, notificationFactory, obtenerResumenPago, calcularBalancePago, calcularFechaPagoHabilitada, clienteMembresiaRepository } = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  pagoRepository: { listarPorGimnasio: vi.fn(), listarConfirmadosPorObligaciones: vi.fn(), crear: vi.fn() },
  notificationFactory: { crear: vi.fn(), crearMultiple: vi.fn() },
  obtenerResumenPago: vi.fn(),
  calcularBalancePago: vi.fn(),
  calcularFechaPagoHabilitada: vi.fn(() => new Date('2026-08-31')),
  clienteMembresiaRepository: { listarActivasConCliente: vi.fn() },
}))

vi.mock('../lib/prisma', () => ({ prisma }))
vi.mock('../repositories/pago.repository', () => ({ pagoRepository }))
vi.mock('../repositories/cliente-membresia.repository', () => ({ clienteMembresiaRepository }))
vi.mock('./notification-factory.service', () => ({ notificationFactory }))
vi.mock('./payment-balance', () => ({ obtenerResumenPago, calcularBalancePago, calcularFechaPagoHabilitada }))

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
  beforeEach(() => {
    vi.clearAllMocks()
    pagoRepository.listarPorGimnasio.mockResolvedValue([])
    pagoRepository.listarConfirmadosPorObligaciones.mockResolvedValue([])
    clienteMembresiaRepository.listarActivasConCliente.mockResolvedValue([])
  })

  describe('sugerencias', () => {
    const obligacion = (idObligacion: number, idCliente: number) => ({
      id_cliente_membresia: BigInt(idObligacion),
      monto_adeudado: 35000,
      fecha_inicio: new Date('2026-08-01'),
      fecha_fin: new Date('2026-08-31'),
      fecha_vencimiento_pago: new Date('2026-08-31'),
      estado: 'activo',
      membresia: { nombre: 'Premium' },
      cliente: { id_cliente: BigInt(idCliente), nombre: 'Cliente', apellido: String(idCliente), cedula: `C${idCliente}` },
    })

    it('prioriza a quienes ya pueden pagar, completa con deudores y no repite cliente', async () => {
      clienteMembresiaRepository.listarActivasConCliente.mockResolvedValue([
        obligacion(1, 10), // habilitado
        obligacion(2, 20), // fuera de ventana, con saldo
        obligacion(3, 10), // mismo cliente que la primera
        obligacion(4, 30), // fuera de ventana y sin saldo
      ])
      calcularBalancePago
        .mockReturnValueOnce({ saldo_pendiente: 5000, estado_pago: 'PARCIAL', pago_habilitado: true })
        .mockReturnValueOnce({ saldo_pendiente: 1000, estado_pago: 'PARCIAL', pago_habilitado: false })
        .mockReturnValueOnce({ saldo_pendiente: 2000, estado_pago: 'PENDIENTE', pago_habilitado: true })
        .mockReturnValueOnce({ saldo_pendiente: 0, estado_pago: 'COMPLETADO', pago_habilitado: false })

      const sugerencias = await pagoService.sugerencias(3n)

      expect(sugerencias.map((s) => s.id_cliente)).toEqual([10, 20])
      expect(sugerencias[0].id_cliente_membresia).toBe(1)
      expect(sugerencias[1].pago_habilitado).toBe(false)
    })

    it('respeta el limite de sugerencias', async () => {
      clienteMembresiaRepository.listarActivasConCliente.mockResolvedValue([
        obligacion(1, 10), obligacion(2, 20), obligacion(3, 30),
      ])
      calcularBalancePago.mockReturnValue({ saldo_pendiente: 5000, estado_pago: 'PENDIENTE', pago_habilitado: true })

      expect(await pagoService.sugerencias(3n, 2)).toHaveLength(2)
    })

    it('devuelve vacio cuando el gimnasio no tiene obligaciones activas', async () => {
      expect(await pagoService.sugerencias(3n)).toEqual([])
      expect(pagoRepository.listarConfirmadosPorObligaciones).not.toHaveBeenCalled()
    })
  })

  describe('listar / resumen', () => {
    it('lista pagos por gimnasio sin filtro de cliente', async () => {
      await pagoService.listar(3n)
      expect(pagoRepository.listarPorGimnasio).toHaveBeenCalledWith(3n, undefined, undefined, undefined)
    })

    it('lista pagos filtrando por cliente', async () => {
      await pagoService.listar(3n, 7n)
      expect(pagoRepository.listarPorGimnasio).toHaveBeenCalledWith(3n, 7n, undefined, undefined)
    })

    it('lista pagos filtrando por fecha o periodo', async () => {
      const inicio = new Date('2026-08-01')
      const fin = new Date('2026-08-31')
      await pagoService.listar(3n, 7n, inicio, fin)
      expect(pagoRepository.listarPorGimnasio).toHaveBeenCalledWith(3n, 7n, inicio, fin)
    })

    it('delega el resumen al balance', async () => {
      obtenerResumenPago.mockResolvedValue({ saldo_pendiente: 0 })
      const r = await pagoService.resumen(3n, 9n)
      expect(obtenerResumenPago).toHaveBeenCalledWith(3n, 9n)
      expect(r).toEqual({ saldo_pendiente: 0 })
    })
  })

  describe('registrar', () => {
    const tx = {
      $queryRaw: vi.fn(),
      cliente: { findUnique: vi.fn() },
    }

    beforeEach(() => {
      tx.$queryRaw.mockResolvedValue([{ id_cliente_membresia: 1n }])
      tx.cliente.findUnique.mockResolvedValue({ nombre: 'Juan', apellido: 'Pérez' })
      transaction(prisma.$transaction, tx)
    })

    it('registra un pago parcial y notifica a cliente, admin y recepcion', async () => {
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
      expect(notificationFactory.crearMultiple).toHaveBeenCalledTimes(1)
      expect(notificationFactory.crearMultiple).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ titulo: 'Pago parcial registrado', destino: { id_cliente: 5n } }),
          expect.objectContaining({ destino: { id_gimnasio: 3n, rol_destino: 'Administrador' } }),
          expect.objectContaining({ destino: { id_gimnasio: 3n, rol_destino: 'Recepcionista' } }),
        ]),
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
      }, 'Recepcionista')

      const notifs = notificationFactory.crearMultiple.mock.calls[0][0]
      expect(notifs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ titulo: 'Pago completado', eventKey: 'pago:11:cliente' }),
          expect.objectContaining({ titulo: 'Pago completado', eventKey: 'pago:11:admin' }),
          expect.objectContaining({ titulo: 'Pago registrado', eventKey: 'pago:11:recepcion', mensaje: expect.stringContaining('Registraste un pago') }),
        ]),
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
      ['VENTANA_NO_ABIERTA', 'PAYMENT_NOT_AVAILABLE_YET'],
      ['MEMBRESIA_INACTIVA', 'MEMBERSHIP_NOT_PAYABLE'],
      ['SALDO_COMPLETADO', 'PAYMENT_ALREADY_COMPLETED'],
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
