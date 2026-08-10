import { describe, expect, it } from 'vitest'
import { calcularBalancePago } from './payment-balance'

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

  it('distingue inicio, apertura de pago y vencimiento', () => {
    const balance = calcularBalancePago({
      total: 10000,
      pagado: 0,
      fechaInicio: new Date('2026-08-01T00:00:00Z'),
      fechaPagoHabilitada: new Date('2026-08-31T00:00:00Z'),
      fechaVencimientoPago: new Date('2026-08-31T00:00:00Z'),
      estadoMembresia: 'activo',
      ahora: new Date('2026-08-09T00:00:00Z'),
    })
    expect(balance).toMatchObject({ pago_habilitado: false, motivo_no_pagable: 'VENTANA_NO_ABIERTA' })
  })

  it('habilita exactamente al abrir la ventana', () => {
    const apertura = new Date('2026-08-31T00:00:00Z')
    const balance = calcularBalancePago({
      total: 10000,
      pagado: 0,
      fechaInicio: new Date('2026-08-01T00:00:00Z'),
      fechaPagoHabilitada: apertura,
      fechaVencimientoPago: apertura,
      estadoMembresia: 'activo',
      ahora: new Date('2026-08-31T06:00:00Z'),
    })
    expect(balance).toMatchObject({ pago_habilitado: true, motivo_no_pagable: null })
  })
})
