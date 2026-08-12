import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'

export type EstadoPagoMembresia = 'PENDIENTE' | 'PARCIAL' | 'COMPLETADO' | 'VENCIDO'
export type MotivoNoPagable = 'MEMBRESIA_INACTIVA' | 'MEMBRESIA_FUTURA' | 'VENTANA_NO_ABIERTA' | 'SALDO_COMPLETADO'
export type PaymentBalanceDb = Pick<typeof prisma, 'clienteMembresia' | 'pago'>

const ESTADOS_PAGO_CONFIRMADO = ['completado', 'confirmado']
const cents = (value: number | string | { toString(): string }) => Math.round(Number(value) * 100)
const BUSINESS_TIME_ZONE = 'America/Costa_Rica'
const businessDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const storedDateKey = (value: Date) => value.toISOString().slice(0, 10)
export const businessDateKey = (value: Date) => {
  const parts = Object.fromEntries(businessDateFormatter.formatToParts(value).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export const DIAS_APERTURA_PAGO_ANTES_VENCIMIENTO = 5

function addDaysUtc(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

// Para planes más cortos que 5 días, se usa el inicio de la membresía.
export function calcularFechaPagoHabilitada(fechaInicio: Date, fechaFin: Date): Date {
  const habilitada = addDaysUtc(fechaFin, -DIAS_APERTURA_PAGO_ANTES_VENCIMIENTO)
  return habilitada < fechaInicio ? fechaInicio : habilitada
}

export function calcularBalancePago(input: {
  total: number | string | { toString(): string }
  pagado: number | string | { toString(): string }
  fechaInicio?: Date
  fechaPagoHabilitada?: Date
  fechaVencimientoPago?: Date
  fechaFin?: Date
  estadoMembresia?: string
  ahora?: Date
}) {
  const totalCentavos = cents(input.total)
  const pagadoCentavos = Math.max(0, cents(input.pagado))
  const pendienteCentavos = Math.max(0, totalCentavos - pagadoCentavos)
  const ahora = input.ahora ?? new Date()
  const fechaVencimientoPago = input.fechaVencimientoPago ?? input.fechaFin ?? ahora
  const fechaPagoHabilitada = input.fechaPagoHabilitada ?? input.fechaInicio ?? ahora
  let estado: EstadoPagoMembresia
  if (pendienteCentavos === 0) estado = 'COMPLETADO'
  else if (storedDateKey(fechaVencimientoPago) < businessDateKey(ahora)) estado = 'VENCIDO'
  else if (pagadoCentavos > 0) estado = 'PARCIAL'
  else estado = 'PENDIENTE'

  let motivo_no_pagable: MotivoNoPagable | null = null
  if (input.estadoMembresia && input.estadoMembresia !== 'activo') motivo_no_pagable = 'MEMBRESIA_INACTIVA'
  else if (input.fechaInicio && businessDateKey(ahora) < storedDateKey(input.fechaInicio)) motivo_no_pagable = 'MEMBRESIA_FUTURA'
  else if (businessDateKey(ahora) < storedDateKey(fechaPagoHabilitada)) motivo_no_pagable = 'VENTANA_NO_ABIERTA'
  else if (pendienteCentavos === 0) motivo_no_pagable = 'SALDO_COMPLETADO'

  return {
    monto_total: totalCentavos / 100,
    monto_pagado: pagadoCentavos / 100,
    saldo_pendiente: pendienteCentavos / 100,
    estado_pago: estado,
    fecha_pago_habilitada: fechaPagoHabilitada,
    fecha_vencimiento_pago: fechaVencimientoPago,
    pago_habilitado: motivo_no_pagable === null,
    motivo_no_pagable,
  }
}

export async function obtenerResumenPago(
  idGimnasio: bigint,
  idClienteMembresia: bigint,
  db: PaymentBalanceDb = prisma,
  ahora = new Date(),
) {
  const asignacion = await db.clienteMembresia.findFirst({
    where: { id_cliente_membresia: idClienteMembresia, cliente: { id_gimnasio: idGimnasio } },
    include: {
      membresia: { select: { nombre: true } },
      cliente: { select: { id_cliente: true, nombre: true, apellido: true } },
    },
  })
  if (!asignacion) throw new AppError('Membresía del cliente no encontrada', 404, 'RESOURCE_NOT_ACCESSIBLE')
  const agregado = await db.pago.aggregate({
    where: { id_cliente_membresia: idClienteMembresia, id_gimnasio: idGimnasio, estado: { in: ESTADOS_PAGO_CONFIRMADO } },
    _sum: { monto: true },
  })
  const balance = calcularBalancePago({
    total: asignacion.monto_adeudado,
    pagado: agregado._sum.monto ?? 0,
    fechaInicio: asignacion.fecha_inicio,
    fechaPagoHabilitada: calcularFechaPagoHabilitada(asignacion.fecha_inicio, asignacion.fecha_fin),
    fechaVencimientoPago: asignacion.fecha_vencimiento_pago,
    estadoMembresia: asignacion.estado,
    ahora,
  })
  return {
    id_cliente_membresia: Number(asignacion.id_cliente_membresia),
    id_cliente: Number(asignacion.id_cliente),
    membresia: asignacion.membresia.nombre,
    cliente: `${asignacion.cliente.nombre} ${asignacion.cliente.apellido}`,
    fecha_inicio: asignacion.fecha_inicio,
    fecha_fin: asignacion.fecha_fin,
    ...balance,
  }
}

export async function obtenerObligacionesPendientesCliente(
  idGimnasio: bigint,
  idCliente: bigint,
  db: PaymentBalanceDb = prisma,
) {
  const obligaciones = await db.clienteMembresia.findMany({
    where: { id_cliente: idCliente, cliente: { id_gimnasio: idGimnasio }, estado: 'activo' },
    select: { id_cliente_membresia: true },
  })
  const balances = []
  for (const obligacion of obligaciones) {
    balances.push(await obtenerResumenPago(idGimnasio, obligacion.id_cliente_membresia, db))
  }
  return balances.filter((balance) => balance.saldo_pendiente > 0)
}
