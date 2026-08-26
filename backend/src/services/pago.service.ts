/**
 * Servicio de negocio del módulo pago.service.
 *
 * @remarks Contiene reglas del dominio FitManager y coordina repositorios, transacciones y efectos secundarios.
 */
import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'
import { pagoRepository } from '../repositories/pago.repository'
import { notificationFactory, type InputCrearNotificacion } from './notification-factory.service'
import { calcularBalancePago, obtenerResumenPago } from './payment-balance'
import type { CrearPagoDto } from '../dtos/pago.dto'
import { normalizarMetodoPago, normalizarReferenciaPago, requiresPaymentReference } from './payment-reference'
import { dashboardService } from './dashboard.service'

function agruparPagosPorObligacion(pagos: any[]) {
  const agrupados = new Map<string, any>()
  for (const pago of pagos) {
    const key = pago.id_obligacion_pago
      ? `obligacion:${pago.id_obligacion_pago.toString()}`
      : `membresia:${pago.id_cliente_membresia.toString()}`
    const existente = agrupados.get(key)
    if (!existente) {
      agrupados.set(key, { ...pago })
      continue
    }
    existente.monto = Number(existente.monto) + Number(pago.monto)
    if (new Date(pago.fecha_pago).getTime() > new Date(existente.fecha_pago).getTime()) {
      existente.id_pago = pago.id_pago
      existente.fecha_pago = pago.fecha_pago
      existente.metodo_pago = pago.metodo_pago
      existente.referencia_pago = pago.referencia_pago
      existente.saldo_pendiente = pago.saldo_pendiente
      existente.estado_obligacion = pago.estado_obligacion
      existente.estado = pago.estado
    }
  }
  return [...agrupados.values()].sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime())
}

export const pagoService = {
  async listar(idGimnasio: bigint, idCliente?: bigint, fechaInicio?: Date, fechaFin?: Date, search?: string) {
    const pagos = await pagoRepository.listarPorGimnasio(idGimnasio, idCliente, fechaInicio, fechaFin, search)
    const ids = [...new Set(pagos.map((p) => p.id_cliente_membresia))]
    const historico = await pagoRepository.listarConfirmadosPorObligaciones(idGimnasio, ids)
    const acumulado = new Map<bigint, number>()
    const resultado = new Map<bigint, { saldo_pendiente: number; estado_obligacion: string }>()
    const asignacionPorId = new Map(pagos.map((p) => [p.id_cliente_membresia, p.cliente_membresia]))

    for (const transaccion of historico) {
      const pagado = (acumulado.get(transaccion.id_cliente_membresia) ?? 0) + Number(transaccion.monto)
      acumulado.set(transaccion.id_cliente_membresia, pagado)
      const asignacion = asignacionPorId.get(transaccion.id_cliente_membresia)
      if (!asignacion) continue
      const balance = calcularBalancePago({
        total: asignacion.monto_adeudado,
        pagado,
        fechaInicio: asignacion.fecha_inicio,
        fechaVencimientoPago: asignacion.fecha_vencimiento_pago,
        estadoMembresia: asignacion.estado,
        ahora: transaccion.fecha_pago,
      })
      resultado.set(transaccion.id_pago, {
        saldo_pendiente: balance.saldo_pendiente,
        estado_obligacion: balance.estado_pago === 'COMPLETADO' ? 'PAGADO' : balance.estado_pago,
      })
    }

    return agruparPagosPorObligacion(
      pagos.map((pago) => ({
        ...pago,
        saldo_pendiente: resultado.get(pago.id_pago)?.saldo_pendiente ?? Number(pago.cliente_membresia.monto_adeudado),
        estado_obligacion: resultado.get(pago.id_pago)?.estado_obligacion ?? 'PENDIENTE',
      })),
    )
  },

  async listarPaginado(
    idGimnasio: bigint,
    page: number,
    pageSize: number,
    idCliente?: bigint,
    fechaInicio?: Date,
    fechaFin?: Date,
    search?: string,
  ) {
    const pagos = await this.listar(idGimnasio, idCliente, fechaInicio, fechaFin, search)
    const offset = (page - 1) * pageSize
    return {
      data: pagos.slice(offset, offset + pageSize),
      totalItems: pagos.length,
    }
  },

  async listarPaginadoTransacciones(
    idGimnasio: bigint,
    page: number,
    pageSize: number,
    idCliente?: bigint,
    fechaInicio?: Date,
    fechaFin?: Date,
    search?: string,
  ) {
    const result = await pagoRepository.listarPorGimnasioPaginado(
      idGimnasio,
      page,
      pageSize,
      idCliente,
      fechaInicio,
      fechaFin,
      search,
    )
    const ids = [...new Set(result.data.map((p) => p.id_cliente_membresia))]
    const historico = await pagoRepository.listarConfirmadosPorObligaciones(idGimnasio, ids)
    const acumulado = new Map<bigint, number>()
    const resultado = new Map<bigint, { saldo_pendiente: number; estado_obligacion: string }>()
    const asignacionPorId = new Map(result.data.map((p) => [p.id_cliente_membresia, p.cliente_membresia]))

    for (const transaccion of historico) {
      const pagado = (acumulado.get(transaccion.id_cliente_membresia) ?? 0) + Number(transaccion.monto)
      acumulado.set(transaccion.id_cliente_membresia, pagado)
      const asignacion = asignacionPorId.get(transaccion.id_cliente_membresia)
      if (!asignacion) continue
      const balance = calcularBalancePago({
        total: asignacion.monto_adeudado,
        pagado,
        fechaInicio: asignacion.fecha_inicio,
        fechaVencimientoPago: asignacion.fecha_vencimiento_pago,
        estadoMembresia: asignacion.estado,
        ahora: transaccion.fecha_pago,
      })
      resultado.set(transaccion.id_pago, {
        saldo_pendiente: balance.saldo_pendiente,
        estado_obligacion: balance.estado_pago === 'COMPLETADO' ? 'PAGADO' : balance.estado_pago,
      })
    }

    return {
      data: result.data.map((pago) => ({
        ...pago,
        saldo_pendiente: resultado.get(pago.id_pago)?.saldo_pendiente ?? Number(pago.cliente_membresia.monto_adeudado),
        estado_obligacion: resultado.get(pago.id_pago)?.estado_obligacion ?? 'PENDIENTE',
      })),
      totalItems: result.totalItems,
    }
  },

  resumen(idGimnasio: bigint, idClienteMembresia: bigint) {
    return obtenerResumenPago(idGimnasio, idClienteMembresia)
  },

  /**
   * Sugiere clientes para el modal de registro de pagos.
   *
   * Primero prioriza obligaciones pagables del periodo/renovación actual y,
   * si no completa el límite solicitado, rellena con clientes que tienen pagos
   * parciales pendientes. Así el cajero ve opciones útiles apenas enfoca el
   * campo de búsqueda sin cargar toda la cartera de clientes.
   *
   * @param idGimnasio - Tenant desde el cual se consultan las obligaciones.
   * @param limite - Cantidad máxima de sugerencias a devolver.
   * @returns Clientes con saldo pendiente y pago actualmente habilitado.
   */
  async sugerirClientesConPago(idGimnasio: bigint, limite = 5) {
    const asignaciones = await prisma.clienteMembresia.findMany({
      where: { estado: 'activo', cliente: { id_gimnasio: idGimnasio, estado: true } },
      select: {
        id_cliente_membresia: true,
        fecha_fin: true,
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            apellido: true,
            cedula: true,
          },
        },
      },
      orderBy: [{ fecha_fin: 'asc' }, { id_cliente_membresia: 'asc' }],
      take: 100,
    })

    const sugerenciasPorCliente = new Map<
      number,
      {
        id_cliente: number
        nombre: string
        apellido: string
        cedula: string
        id_cliente_membresia: number
        saldo_pendiente: number
        estado_pago: string
        pago_habilitado: boolean
        fecha_vencimiento_pago: Date
      }
    >()

    for (const asignacion of asignaciones) {
      const idCliente = Number(asignacion.cliente.id_cliente)
      if (sugerenciasPorCliente.has(idCliente)) continue
      const resumen = await obtenerResumenPago(idGimnasio, asignacion.id_cliente_membresia)
      if (resumen.saldo_pendiente <= 0 || !resumen.pago_habilitado) continue
      sugerenciasPorCliente.set(idCliente, {
        id_cliente: idCliente,
        nombre: asignacion.cliente.nombre,
        apellido: asignacion.cliente.apellido,
        cedula: asignacion.cliente.cedula,
        id_cliente_membresia: resumen.id_cliente_membresia,
        saldo_pendiente: resumen.saldo_pendiente,
        estado_pago: resumen.estado_pago,
        pago_habilitado: resumen.pago_habilitado,
        fecha_vencimiento_pago: resumen.fecha_vencimiento_pago,
      })
    }

    const sugerencias = [...sugerenciasPorCliente.values()]
    const pagosHabilitados = sugerencias
      .filter((item) => item.estado_pago !== 'PARCIAL')
      .sort((a, b) => new Date(a.fecha_vencimiento_pago).getTime() - new Date(b.fecha_vencimiento_pago).getTime())
    const pagosParciales = sugerencias
      .filter((item) => item.estado_pago === 'PARCIAL')
      .sort((a, b) => b.saldo_pendiente - a.saldo_pendiente)

    return [...pagosHabilitados, ...pagosParciales].slice(0, Math.max(1, Math.min(limite, 5)))
  },

  /**
   * Registra un pago manual validando saldo, disponibilidad e idempotencia.
   *
   * La membresía se bloquea dentro de una transacción para evitar pagos
   * concurrentes sobre el mismo saldo. Los comprobantes de tarjeta,
   * transferencia y SINPE deben ser únicos por gimnasio para prevenir
   * duplicados operativos.
   *
   * @param idGimnasio - Gimnasio al que pertenece el pago.
   * @param dto - Datos validados del pago recibido desde el controlador.
   * @param actorRol - Rol que registra el pago para personalizar auditoría/notificación.
   * @returns Identificador del pago creado y resumen financiero posterior.
   */
  registrar(idGimnasio: bigint, dto: CrearPagoDto, actorRol?: string) {
    return prisma.$transaction(async (tx) => {
      const idAsignacion = BigInt(dto.id_cliente_membresia)
      const bloqueada = await tx.$queryRaw<Array<{ id_cliente_membresia: bigint }>>`
        SELECT cm.id_cliente_membresia
        FROM cliente_membresia cm
        INNER JOIN cliente c ON c.id_cliente = cm.id_cliente
        WHERE cm.id_cliente_membresia = ${idAsignacion}
          AND c.id_gimnasio = ${idGimnasio}
        FOR UPDATE OF cm
      `
      if (bloqueada.length === 0) {
        throw new AppError('Membresía del cliente no encontrada', 404, 'RESOURCE_NOT_ACCESSIBLE')
      }
      const resumenAntes = await obtenerResumenPago(idGimnasio, idAsignacion, tx)
      if (resumenAntes.id_cliente !== dto.id_cliente) {
        throw new AppError('Membresía del cliente no encontrada', 404, 'RESOURCE_NOT_ACCESSIBLE')
      }
      if (!resumenAntes.pago_habilitado) {
        const codigo =
          resumenAntes.motivo_no_pagable === 'MEMBRESIA_FUTURA'
            ? 'FUTURE_MEMBERSHIP'
            : resumenAntes.motivo_no_pagable === 'VENTANA_NO_ABIERTA'
              ? 'PAYMENT_NOT_AVAILABLE_YET'
              : resumenAntes.motivo_no_pagable === 'MEMBRESIA_INACTIVA'
                ? 'MEMBERSHIP_NOT_PAYABLE'
                : resumenAntes.motivo_no_pagable === 'SALDO_COMPLETADO'
                  ? 'PAYMENT_ALREADY_COMPLETED'
                  : 'PAYMENT_NOT_ALLOWED_YET'
        const mensaje =
          resumenAntes.motivo_no_pagable === 'VENTANA_NO_ABIERTA'
            ? `El pago de esta membresía estará disponible a partir del ${new Date(resumenAntes.fecha_pago_habilitada).toISOString().slice(0, 10)}.`
            : 'El pago no está habilitado para esta membresía'
        throw new AppError(mensaje, 409, codigo, {
          fecha_pago_habilitada: resumenAntes.fecha_pago_habilitada,
          fecha_vencimiento_pago: resumenAntes.fecha_vencimiento_pago,
          availableFrom: new Date(resumenAntes.fecha_pago_habilitada).toISOString().slice(0, 10),
          expiresAt: new Date(resumenAntes.fecha_vencimiento_pago).toISOString().slice(0, 10),
          motivo: resumenAntes.motivo_no_pagable,
        })
      }

      const montoCentavos = Math.round(dto.monto * 100)
      const saldoCentavos = Math.round(resumenAntes.saldo_pendiente * 100)
      if (montoCentavos > saldoCentavos) {
        throw new AppError('El monto supera el saldo pendiente', 409, 'PAYMENT_EXCEEDS_BALANCE', {
          saldo_pendiente: resumenAntes.saldo_pendiente,
        })
      }
      const metodoPago = normalizarMetodoPago(dto.metodo_pago)
      const referenciaPago = normalizarReferenciaPago(dto.referencia_pago)
      if (requiresPaymentReference(metodoPago) && !referenciaPago) {
        throw new AppError(
          'El método de pago requiere identificador o número de comprobante',
          400,
          'PAYMENT_REFERENCE_REQUIRED',
          {
            metodo_pago: metodoPago,
          },
        )
      }
      if (referenciaPago) {
        const duplicado = await pagoRepository.buscarReferencia(idGimnasio, metodoPago, referenciaPago, tx)
        if (duplicado) {
          throw new AppError('Ya existe un pago confirmado con ese comprobante', 409, 'DUPLICATE_PAYMENT_REFERENCE', {
            metodo_pago: metodoPago,
            referencia_pago: referenciaPago,
          })
        }
      }

      const pago = await pagoRepository.crear(
        {
          id_gimnasio: idGimnasio,
          id_cliente: BigInt(dto.id_cliente),
          id_cliente_membresia: idAsignacion,
          id_obligacion_pago: resumenAntes.id_obligacion_pago ? BigInt(resumenAntes.id_obligacion_pago) : null,
          monto: dto.monto,
          metodo_pago: metodoPago,
          referencia_pago: referenciaPago,
          estado: 'completado',
        },
        tx,
      )
      const resumen = await obtenerResumenPago(idGimnasio, idAsignacion, tx)
      const completado = resumen.estado_pago === 'COMPLETADO'

      if (completado && resumenAntes.tipo_obligacion === 'RENOVACION') {
        await tx.clienteMembresia.update({
          where: { id_cliente_membresia: idAsignacion },
          data: {
            fecha_fin: resumenAntes.periodo_fin,
            monto_adeudado: { increment: resumenAntes.monto_total },
            fecha_pago_habilitada: resumenAntes.fecha_pago_habilitada,
            fecha_vencimiento_pago: resumenAntes.periodo_fin,
          },
        })
        if (resumenAntes.id_obligacion_pago) {
          await tx.obligacionPago.update({
            where: { id_obligacion_pago: BigInt(resumenAntes.id_obligacion_pago) },
            data: { estado: 'COMPLETADA' },
          })
        }
      }

      const cliente = await tx.cliente.findUnique({
        where: { id_cliente: BigInt(dto.id_cliente) },
        select: { nombre: true, apellido: true },
      })
      const clienteNombre = cliente ? `${cliente.nombre} ${cliente.apellido}` : 'el cliente'
      const montoStr = dto.monto.toLocaleString('es-CR')
      const saldoStr = resumen.saldo_pendiente.toLocaleString('es-CR')
      const saldoLinea = completado ? 'Saldo pendiente: ₡0.' : `Saldo pendiente: ₡${saldoStr}.`

      const notifs: InputCrearNotificacion[] = [
        {
          eventKey: `pago:${pago.id_pago}:cliente`,
          tipo: 'SISTEMA',
          destino: { id_cliente: BigInt(dto.id_cliente) },
          titulo: completado ? 'Pago completado' : 'Pago parcial registrado',
          mensaje: completado
            ? `Tu membresía ${resumen.membresia} está completamente pagada. Total recibido: ₡${montoStr}.`
            : `Recibimos tu pago de ₡${montoStr}. ${saldoLinea}`,
          accionUrl: '/cliente/membresia',
        },
        {
          eventKey: `pago:${pago.id_pago}:admin`,
          tipo: 'SISTEMA',
          destino: { id_gimnasio: idGimnasio, rol_destino: 'Administrador' },
          titulo: completado ? 'Pago completado' : 'Pago parcial registrado',
          mensaje: completado
            ? `${clienteNombre} completó el pago de su membresía ${resumen.membresia} por ₡${montoStr}.`
            : `${clienteNombre} realizó un pago de ₡${montoStr}. ${saldoLinea}`,
          accionUrl: '/dashboard/pagos',
        },
        {
          eventKey: `pago:${pago.id_pago}:recepcion`,
          tipo: 'SISTEMA',
          destino: { id_gimnasio: idGimnasio, rol_destino: 'Recepcionista' },
          titulo: 'Pago registrado',
          mensaje:
            actorRol === 'Recepcionista'
              ? `Registraste un pago de ₡${montoStr} para ${clienteNombre}. ${saldoLinea}`
              : `Se registró un pago de ₡${montoStr} para ${clienteNombre}. ${saldoLinea}`,
          accionUrl: '/dashboard/pagos',
        },
      ]

      await notificationFactory.crearMultiple(notifs, tx)
      console.info(
        JSON.stringify({
          level: 'info',
          event: 'business_audit',
          action: completado ? 'PAYMENT_COMPLETED' : 'PAYMENT_REGISTERED',
          paymentId: pago.id_pago.toString(),
          gymId: idGimnasio.toString(),
        }),
      )
      dashboardService.invalidar(idGimnasio)
      return { id_pago: pago.id_pago, resumen }
    })
  },
}
