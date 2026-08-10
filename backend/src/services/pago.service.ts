import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'
import { pagoRepository } from '../repositories/pago.repository'
import { notificationFactory } from './notification-factory.service'
import { obtenerResumenPago } from './payment-balance'
import type { CrearPagoDto } from '../dtos/pago.dto'

export const pagoService = {
  listar(idGimnasio: bigint, idCliente?: bigint) {
    return pagoRepository.listarPorGimnasio(idGimnasio, idCliente)
  },

  resumen(idGimnasio: bigint, idClienteMembresia: bigint) {
    return obtenerResumenPago(idGimnasio, idClienteMembresia)
  },

  registrar(idGimnasio: bigint, dto: CrearPagoDto) {
    return prisma.$transaction(async (tx) => {
      const idAsignacion = BigInt(dto.id_cliente_membresia)
      await tx.$queryRaw`SELECT id_cliente_membresia FROM cliente_membresia WHERE id_cliente_membresia = ${idAsignacion} FOR UPDATE`
      const resumenAntes = await obtenerResumenPago(idGimnasio, idAsignacion, tx)
      if (resumenAntes.id_cliente !== dto.id_cliente) {
        throw new AppError('Membresía del cliente no encontrada', 404, 'RESOURCE_NOT_ACCESSIBLE')
      }
      if (!resumenAntes.pago_habilitado) {
        const codigo = resumenAntes.motivo_no_pagable === 'MEMBRESIA_FUTURA'
          ? 'FUTURE_MEMBERSHIP'
          : resumenAntes.motivo_no_pagable === 'MEMBRESIA_INACTIVA'
            ? 'MEMBERSHIP_NOT_PAYABLE'
            : resumenAntes.motivo_no_pagable === 'SALDO_COMPLETADO'
              ? 'PAYMENT_ALREADY_COMPLETED'
              : 'PAYMENT_NOT_ALLOWED_YET'
        throw new AppError('El pago no está habilitado para esta membresía', 409, codigo, {
          fecha_pago_habilitada: resumenAntes.fecha_pago_habilitada,
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
      await notificationFactory.crear({
        eventKey: `pago:${pago.id_pago}:${completado ? 'completado' : 'parcial'}`,
        tipo: 'SISTEMA',
        destino: { id_cliente: BigInt(dto.id_cliente) },
        titulo: completado ? 'Pago completado' : 'Pago recibido',
        mensaje: completado
          ? `El pago de tu membresía ${resumen.membresia} quedó completado. Saldo pendiente: ₡0.`
          : `Pago recibido: ₡${dto.monto.toLocaleString('es-CR')}. Saldo pendiente de ${resumen.membresia}: ₡${resumen.saldo_pendiente.toLocaleString('es-CR')}.`,
      }, tx)
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
