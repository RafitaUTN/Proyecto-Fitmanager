import { describe, expect, it } from 'vitest'
import { calcularBalancePago } from './payment-balance'

const futura = new Date('2099-01-01T00:00:00Z')

describe('balance de pagos', () => {
  it('calcula un pago parcial de 7000 sobre 10000', () => {
    expect(calcularBalancePago({ total: 10000, pagado: 7000, fechaFin: futura })).toEqual({
      monto_total: 10000, monto_pagado: 7000, saldo_pendiente: 3000, estado_pago: 'PARCIAL',
    })
  })

  it('completa el saldo con el segundo pago', () => {
    expect(calcularBalancePago({ total: 10000, pagado: 10000, fechaFin: futura }).estado_pago).toBe('COMPLETADO')
  })

  it('marca vencido cuando conserva saldo después de la fecha final', () => {
    expect(calcularBalancePago({ total: 10000, pagado: 7000, fechaFin: new Date('2020-01-01') }).estado_pago).toBe('VENCIDO')
  })
})
