/**
 * Servicio de negocio del módulo payment-balance.
 *
 * @remarks Contiene reglas del dominio FitManager y coordina repositorios, transacciones y efectos secundarios.
 */
import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'

export type EstadoPagoMembresia = 'PENDIENTE' | 'PARCIAL' | 'COMPLETADO' | 'VENCIDO'
export type MotivoNoPagable = 'MEMBRESIA_INACTIVA' | 'MEMBRESIA_FUTURA' | 'VENTANA_NO_ABIERTA' | 'SALDO_COMPLETADO'
export type PaymentBalanceDb = Pick<typeof prisma, 'clienteMembresia' | 'pago' | 'obligacionPago'>

export const ESTADOS_PAGO_CONFIRMADO = ['completado', 'confirmado']
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

function estadoObligacionDesdeBalance(balance: { estado_pago: EstadoPagoMembresia }) {
  if (balance.estado_pago === 'COMPLETADO') return 'COMPLETADA'
  return balance.estado_pago
}

// Para planes más cortos que 5 días, se usa el inicio de la membresía.
export function calcularFechaPagoHabilitada(fechaInicio: Date, fechaFin: Date): Date {
  const habilitada = addDaysUtc(fechaFin, -DIAS_APERTURA_PAGO_ANTES_VENCIMIENTO)
  return habilitada < fechaInicio ? fechaInicio : habilitada
}

/**
 * Calcula el balance financiero de una obligación de membresía.
 *
 * La regla permite pagar saldos parciales del periodo actual en cualquier
 * momento, pero bloquea pagos de renovación futura hasta cinco días antes del
 * vencimiento. Devuelve también el motivo exacto cuando el pago no está
 * habilitado para que el frontend pueda mostrar un mensaje claro.
 *
 * @param input - Monto total, monto pagado, fechas del periodo y estado de membresía.
 * @returns Balance normalizado con saldo, estado y disponibilidad de pago.
 */
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
  const tienePagoParcial = pagadoCentavos > 0 && pendienteCentavos > 0
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
  else if (input.fechaInicio && businessDateKey(ahora) < storedDateKey(input.fechaInicio))
    motivo_no_pagable = 'MEMBRESIA_FUTURA'
  else if (!tienePagoParcial && businessDateKey(ahora) < storedDateKey(fechaPagoHabilitada))
    motivo_no_pagable = 'VENTANA_NO_ABIERTA'
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
      membresia: { select: { nombre: true, precio: true, duracion_dias: true } },
      cliente: { select: { id_cliente: true, nombre: true, apellido: true } },
    },
  })
  if (!asignacion) throw new AppError('Membresía del cliente no encontrada', 404, 'RESOURCE_NOT_ACCESSIBLE')

  const obligacionesExistentes = await db.obligacionPago.count({
    where: { id_cliente_membresia: idClienteMembresia, id_gimnasio: idGimnasio },
  })

  if (obligacionesExistentes === 0) {
    await db.obligacionPago.upsert({
      where: {
        id_cliente_membresia_periodo_inicio_periodo_fin_tipo: {
          id_cliente_membresia: idClienteMembresia,
          periodo_inicio: asignacion.fecha_inicio,
          periodo_fin: asignacion.fecha_fin,
          tipo: 'PERIODO',
        },
      },
      create: {
        id_gimnasio: idGimnasio,
        id_cliente: asignacion.id_cliente,
        id_cliente_membresia: idClienteMembresia,
        periodo_inicio: asignacion.fecha_inicio,
        periodo_fin: asignacion.fecha_fin,
        monto_total: asignacion.monto_adeudado,
        fecha_pago_habilitada: asignacion.fecha_pago_habilitada,
        fecha_vencimiento: asignacion.fecha_vencimiento_pago,
        tipo: 'PERIODO',
      },
      update: {},
    })
  }

  const obligaciones = await db.obligacionPago.findMany({
    where: { id_cliente_membresia: idClienteMembresia, id_gimnasio: idGimnasio },
    orderBy: [{ periodo_inicio: 'asc' }, { id_obligacion_pago: 'asc' }],
  })

  let seleccionada = null as null | (typeof obligaciones)[number]
  let balanceSeleccionado: ReturnType<typeof calcularBalancePago> | null = null
  let ultimaObligacion = null as null | (typeof obligaciones)[number]
  let ultimoBalance: ReturnType<typeof calcularBalancePago> | null = null

  for (const obligacion of obligaciones) {
    const agregado = await db.pago.aggregate({
      where: {
        id_obligacion_pago: obligacion.id_obligacion_pago,
        id_gimnasio: idGimnasio,
        estado: { in: ESTADOS_PAGO_CONFIRMADO },
      },
      _sum: { monto: true },
    })
    const balance = calcularBalancePago({
      total: obligacion.monto_total,
      pagado: agregado._sum.monto ?? 0,
      fechaInicio: obligacion.periodo_inicio,
      fechaPagoHabilitada: obligacion.fecha_pago_habilitada,
      fechaVencimientoPago: obligacion.fecha_vencimiento,
      estadoMembresia: asignacion.estado,
      ahora,
    })
    const estadoActual = estadoObligacionDesdeBalance(balance)
    if (estadoActual !== obligacion.estado) {
      await db.obligacionPago.update({
        where: { id_obligacion_pago: obligacion.id_obligacion_pago },
        data: { estado: estadoActual },
      })
    }
    ultimaObligacion = obligacion
    ultimoBalance = balance
    if (balance.saldo_pendiente > 0 && !seleccionada) {
      seleccionada = obligacion
      balanceSeleccionado = balance
    }
  }

  if (!seleccionada) {
    const aperturaRenovacion = calcularFechaPagoHabilitada(asignacion.fecha_inicio, asignacion.fecha_fin)
    const ventanaAbierta = businessDateKey(ahora) >= storedDateKey(aperturaRenovacion)
    if (asignacion.estado === 'activo' && ventanaAbierta) {
      const inicioRenovacion = asignacion.fecha_fin
      const finRenovacion = addDaysUtc(inicioRenovacion, asignacion.membresia.duracion_dias)
      seleccionada = await db.obligacionPago.upsert({
        where: {
          id_cliente_membresia_periodo_inicio_periodo_fin_tipo: {
            id_cliente_membresia: idClienteMembresia,
            periodo_inicio: inicioRenovacion,
            periodo_fin: finRenovacion,
            tipo: 'RENOVACION',
          },
        },
        create: {
          id_gimnasio: idGimnasio,
          id_cliente: asignacion.id_cliente,
          id_cliente_membresia: idClienteMembresia,
          periodo_inicio: inicioRenovacion,
          periodo_fin: finRenovacion,
          monto_total: asignacion.membresia.precio,
          fecha_pago_habilitada: aperturaRenovacion,
          fecha_vencimiento: asignacion.fecha_fin,
          tipo: 'RENOVACION',
        },
        update: {},
      })
      const agregadoRenovacion = await db.pago.aggregate({
        where: {
          id_obligacion_pago: seleccionada.id_obligacion_pago,
          id_gimnasio: idGimnasio,
          estado: { in: ESTADOS_PAGO_CONFIRMADO },
        },
        _sum: { monto: true },
      })
      balanceSeleccionado = calcularBalancePago({
        total: seleccionada.monto_total,
        pagado: agregadoRenovacion._sum.monto ?? 0,
        fechaInicio: seleccionada.periodo_inicio,
        fechaPagoHabilitada: seleccionada.fecha_pago_habilitada,
        fechaVencimientoPago: seleccionada.fecha_vencimiento,
        estadoMembresia: asignacion.estado,
        ahora,
      })
    }
  }

  if (seleccionada && balanceSeleccionado) {
    return {
      id_obligacion_pago: Number(seleccionada.id_obligacion_pago),
      tipo_obligacion: seleccionada.tipo,
      periodo_inicio: seleccionada.periodo_inicio,
      periodo_fin: seleccionada.periodo_fin,
      id_cliente_membresia: Number(asignacion.id_cliente_membresia),
      id_cliente: Number(asignacion.id_cliente),
      membresia: asignacion.membresia.nombre,
      cliente: `${asignacion.cliente.nombre} ${asignacion.cliente.apellido}`,
      fecha_inicio: asignacion.fecha_inicio,
      fecha_fin: asignacion.fecha_fin,
      ...balanceSeleccionado,
    }
  }

  if (ultimaObligacion && ultimoBalance) {
    return {
      id_obligacion_pago: Number(ultimaObligacion.id_obligacion_pago),
      tipo_obligacion: ultimaObligacion.tipo,
      periodo_inicio: ultimaObligacion.periodo_inicio,
      periodo_fin: ultimaObligacion.periodo_fin,
      id_cliente_membresia: Number(asignacion.id_cliente_membresia),
      id_cliente: Number(asignacion.id_cliente),
      membresia: asignacion.membresia.nombre,
      cliente: `${asignacion.cliente.nombre} ${asignacion.cliente.apellido}`,
      fecha_inicio: asignacion.fecha_inicio,
      fecha_fin: asignacion.fecha_fin,
      ...ultimoBalance,
    }
  }

  const agregado = await db.pago.aggregate({
    where: {
      id_cliente_membresia: idClienteMembresia,
      id_gimnasio: idGimnasio,
      estado: { in: ESTADOS_PAGO_CONFIRMADO },
    },
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
    id_obligacion_pago: null,
    tipo_obligacion: 'PERIODO',
    periodo_inicio: asignacion.fecha_inicio,
    periodo_fin: asignacion.fecha_fin,
    id_cliente_membresia: Number(asignacion.id_cliente_membresia),
    id_cliente: Number(asignacion.id_cliente),
    membresia: asignacion.membresia.nombre,
    cliente: `${asignacion.cliente.nombre} ${asignacion.cliente.apellido}`,
    fecha_inicio: asignacion.fecha_inicio,
    fecha_fin: asignacion.fecha_fin,
    ...balance,
  }
}

/**
 * Obtiene todas las obligaciones pendientes de un cliente dentro de un gimnasio.
 *
 * Se usa antes de aprobar transferencias o registrar renovaciones para impedir
 * que un cliente sea movido o renovado con deuda activa. La consulta se ejecuta
 * por tenant y solo considera membresías activas.
 *
 * @param idGimnasio - Gimnasio dueño de la consulta.
 * @param idCliente - Cliente que se desea validar.
 * @param db - Cliente Prisma o transacción activa.
 * @returns Obligaciones con saldo pendiente mayor a cero.
 */
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
