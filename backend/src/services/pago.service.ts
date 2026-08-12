import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'
import { pagoRepository } from '../repositories/pago.repository'
import { notificationFactory, type InputCrearNotificacion } from './notification-factory.service'
import { calcularBalancePago, obtenerResumenPago } from './payment-balance'
import type { CrearPagoDto } from '../dtos/pago.dto'

export const pagoService = {
  async listar(idGimnasio: bigint, idCliente?: bigint, fechaInicio?: Date, fechaFin?: Date) {
    const pagos = await pagoRepository.listarPorGimnasio(idGimnasio, idCliente, fechaInicio, fechaFin)
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

    return pagos.map((pago) => ({
      ...pago,
      saldo_pendiente: resultado.get(pago.id_pago)?.saldo_pendiente ?? Number(pago.cliente_membresia.monto_adeudado),
      estado_obligacion: resultado.get(pago.id_pago)?.estado_obligacion ?? 'PENDIENTE',
    }))
  },

  resumen(idGimnasio: bigint, idClienteMembresia: bigint) {
    return obtenerResumenPago(idGimnasio, idClienteMembresia)
  },

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
        const codigo = resumenAntes.motivo_no_pagable === 'MEMBRESIA_FUTURA'
          ? 'FUTURE_MEMBERSHIP'
          : resumenAntes.motivo_no_pagable === 'VENTANA_NO_ABIERTA'
            ? 'PAYMENT_NOT_AVAILABLE_YET'
          : resumenAntes.motivo_no_pagable === 'MEMBRESIA_INACTIVA'
            ? 'MEMBERSHIP_NOT_PAYABLE'
            : resumenAntes.motivo_no_pagable === 'SALDO_COMPLETADO'
              ? 'PAYMENT_ALREADY_COMPLETED'
              : 'PAYMENT_NOT_ALLOWED_YET'
        const mensaje = resumenAntes.motivo_no_pagable === 'VENTANA_NO_ABIERTA'
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

      const pago = await pagoRepository.crear({
        id_gimnasio: idGimnasio,
        id_cliente: BigInt(dto.id_cliente),
        id_cliente_membresia: idAsignacion,
        monto: dto.monto,
        metodo_pago: dto.metodo_pago,
        estado: 'completado',
      }, tx)
      const resumen = await obtenerResumenPago(idGimnasio, idAsignacion, tx)
      const completado = resumen.estado_pago === 'COMPLETADO'

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
          mensaje: actorRol === 'Recepcionista'
            ? `Registraste un pago de ₡${montoStr} para ${clienteNombre}. ${saldoLinea}`
            : `Se registró un pago de ₡${montoStr} para ${clienteNombre}. ${saldoLinea}`,
          accionUrl: '/dashboard/pagos',
        },
      ]

      await notificationFactory.crearMultiple(notifs, tx)
      console.info(JSON.stringify({
        level: 'info',
        event: 'business_audit',
        action: completado ? 'PAYMENT_COMPLETED' : 'PAYMENT_REGISTERED',
        paymentId: pago.id_pago.toString(),
        gymId: idGimnasio.toString(),
      }))
      return { id_pago: pago.id_pago, resumen }
    })
  },
}
