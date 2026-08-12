import { describe, expect, it } from 'vitest'
import { calcularBalancePago, calcularFechaPagoHabilitada } from './payment-balance'

const futura = new Date('2099-01-01T00:00:00Z')

describe('balance de pagos', () => {
  it('calcula un pago parcial de 7000 sobre 10000', () => {
    expect(calcularBalancePago({ total: 10000, pagado: 7000, fechaFin: futura })).toMatchObject({
      monto_total: 10000, monto_pagado: 7000, saldo_pendiente: 3000, estado_pago: 'PARCIAL',
    })
  })

  it('completa el saldo con el segundo pago', () => {
    expect(calcularBalancePago({ total: 10000, pagado: 10000, fechaFin: futura }).estado_pago).toBe('COMPLETADO')
  })

  it('marca vencido cuando conserva saldo después de la fecha final', () => {
    expect(calcularBalancePago({ total: 10000, pagado: 7000, fechaFin: new Date('2020-01-01') }).estado_pago).toBe('VENCIDO')
  })

  it.each([
    ['2026-08-11T18:00:00Z', false],
    ['2026-08-24T18:00:00Z', false],
    ['2026-08-25T18:00:00Z', true],
    ['2026-08-30T18:00:00Z', true],
  ])('aplica la ventana de cinco días: %s => %s', (ahora, habilitado) => {
    const balance = calcularBalancePago({
      total: 20000,
      pagado: 0,
      fechaInicio: new Date('2026-08-01T00:00:00Z'),
      fechaPagoHabilitada: new Date('2026-08-25T00:00:00Z'),
      fechaVencimientoPago: new Date('2026-08-30T00:00:00Z'),
      estadoMembresia: 'activo',
      ahora: new Date(ahora),
    })
    expect(balance.pago_habilitado).toBe(habilitado)
    expect(balance.motivo_no_pagable).toBe(habilitado ? null : 'VENTANA_NO_ABIERTA')
  })

  it('sigue habilitado después del vencimiento mientras exista saldo', () => {
    const balance = calcularBalancePago({
      total: 10000,
      pagado: 0,
      fechaInicio: new Date('2026-08-01T00:00:00Z'),
      fechaPagoHabilitada: new Date('2026-08-31T00:00:00Z'),
      fechaVencimientoPago: new Date('2026-08-31T00:00:00Z'),
      estadoMembresia: 'activo',
      ahora: new Date('2026-09-02T18:00:00Z'),
    })
    expect(balance).toMatchObject({ pago_habilitado: true, motivo_no_pagable: null })
  })

  it('bloquea el pago solo si la membresía aún no inicia', () => {
    const balance = calcularBalancePago({
      total: 10000,
      pagado: 0,
      fechaInicio: new Date('2026-09-01T00:00:00Z'),
      fechaPagoHabilitada: new Date('2026-08-27T00:00:00Z'),
      fechaVencimientoPago: new Date('2026-09-30T00:00:00Z'),
      estadoMembresia: 'activo',
      ahora: new Date('2026-08-09T00:00:00Z'),
    })
    expect(balance).toMatchObject({ pago_habilitado: false, motivo_no_pagable: 'MEMBRESIA_FUTURA' })
  })
})

describe('calcularFechaPagoHabilitada', () => {
  it('abre la ventana 5 días antes del vencimiento', () => {
    const inicio = new Date('2026-08-10T00:00:00Z')
    const fin = new Date('2026-09-09T00:00:00Z')
    expect(calcularFechaPagoHabilitada(inicio, fin).toISOString()).toBe('2026-09-04T00:00:00.000Z')
  })

  it('no retrocede antes del inicio en planes cortos', () => {
    const inicio = new Date('2026-08-10T00:00:00Z')
    const fin = new Date('2026-08-12T00:00:00Z')
    expect(calcularFechaPagoHabilitada(inicio, fin).toISOString()).toBe('2026-08-10T00:00:00.000Z')
  })
})
