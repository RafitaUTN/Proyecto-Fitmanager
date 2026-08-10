export type EstadoPagoMembresia = 'PENDIENTE' | 'PARCIAL' | 'COMPLETADO' | 'VENCIDO'

const cents = (value: number | string | { toString(): string }) => Math.round(Number(value) * 100)

export function calcularBalancePago(input: {
  total: number | string | { toString(): string }
  pagado: number | string | { toString(): string }
  fechaFin: Date
  ahora?: Date
}) {
  const totalCentavos = cents(input.total)
  const pagadoCentavos = Math.max(0, cents(input.pagado))
  const pendienteCentavos = Math.max(0, totalCentavos - pagadoCentavos)
  const ahora = input.ahora ?? new Date()
  let estado: EstadoPagoMembresia
  if (pendienteCentavos === 0) estado = 'COMPLETADO'
  else if (input.fechaFin < ahora) estado = 'VENCIDO'
  else if (pagadoCentavos > 0) estado = 'PARCIAL'
  else estado = 'PENDIENTE'
  return {
    monto_total: totalCentavos / 100,
    monto_pagado: pagadoCentavos / 100,
    saldo_pendiente: pendienteCentavos / 100,
    estado_pago: estado,
  }
}
