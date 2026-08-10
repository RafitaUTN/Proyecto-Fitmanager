import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'
import { pagoRepository } from '../repositories/pago.repository'
import { notificationFactory } from './notification-factory.service'
import { calcularBalancePago } from './payment-balance'
import type { CrearPagoDto } from '../dtos/pago.dto'

const ESTADOS_VALIDOS = ['completado', 'confirmado']
type PaymentDb = Pick<typeof prisma, 'clienteMembresia' | 'pago'>

async function obtenerResumen(idGimnasio: bigint, idClienteMembresia: bigint, db: PaymentDb = prisma) {
  const asignacion = await db.clienteMembresia.findFirst({
    where: {
      id_cliente_membresia: idClienteMembresia,
      cliente: { id_gimnasio: idGimnasio },
    },
    include: {
      membresia: { select: { nombre: true, precio: true } },
      cliente: { select: { id_cliente: true, nombre: true, apellido: true } },
    },
  })
  if (!asignacion) throw new AppError('Membresía del cliente no encontrada', 404, 'RESOURCE_NOT_ACCESSIBLE')
  const agregado = await db.pago.aggregate({
    where: { id_cliente_membresia: idClienteMembresia, id_gimnasio: idGimnasio, estado: { in: ESTADOS_VALIDOS } },
    _sum: { monto: true },
  })
  const balance = calcularBalancePago({
    total: asignacion.membresia.precio,
    pagado: agregado._sum.monto ?? 0,
    fechaFin: asignacion.fecha_fin,
  })
  return {
    id_cliente_membresia: Number(asignacion.id_cliente_membresia),
    id_cliente: Number(asignacion.id_cliente),
    membresia: asignacion.membresia.nombre,
    cliente: `${asignacion.cliente.nombre} ${asignacion.cliente.apellido}`,
    fecha_pago_habilitada: asignacion.fecha_inicio,
    fecha_vencimiento: asignacion.fecha_fin,
    ...balance,
  }
}

export const pagoService = {
  listar(idGimnasio: bigint, idCliente?: bigint) {
    return pagoRepository.listarPorGimnasio(idGimnasio, idCliente)
  },

  resumen(idGimnasio: bigint, idClienteMembresia: bigint) {
    return obtenerResumen(idGimnasio, idClienteMembresia)
  },

  registrar(idGimnasio: bigint, dto: CrearPagoDto) {
    return prisma.$transaction(async (tx) => {
      const idAsignacion = BigInt(dto.id_cliente_membresia)
      await tx.$queryRaw`SELECT id_cliente_membresia FROM cliente_membresia WHERE id_cliente_membresia = ${idAsignacion} FOR UPDATE`
      const resumenAntes = await obtenerResumen(idGimnasio, idAsignacion, tx)
      if (resumenAntes.id_cliente !== dto.id_cliente) {
        throw new AppError('Membresía del cliente no encontrada', 404, 'RESOURCE_NOT_ACCESSIBLE')
      }
      const ahora = new Date()
      if (ahora < new Date(resumenAntes.fecha_pago_habilitada)) {
        throw new AppError('El pago todavía no está habilitado para esta membresía', 409, 'PAYMENT_NOT_ALLOWED_YET', {
          fecha_pago_habilitada: resumenAntes.fecha_pago_habilitada,
        })
      }
      if (resumenAntes.saldo_pendiente <= 0) {
        throw new AppError('Esta membresía ya está pagada por completo', 409, 'PAYMENT_ALREADY_COMPLETED')
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
      const resumen = await obtenerResumen(idGimnasio, idAsignacion, tx)
      const completado = resumen.estado_pago === 'COMPLETADO'
      await notificationFactory.crear({
        eventKey: `pago:${pago.id_pago}:${completado ? 'completado' : 'parcial'}`,
        tipo: 'SISTEMA',
        destino: { id_cliente: BigInt(dto.id_cliente) },
        titulo: completado ? 'Pago completado' : 'Pago parcial registrado',
        mensaje: completado
          ? `El pago de tu membresía ${resumen.membresia} quedó completado.`
          : `Registramos tu pago. El saldo pendiente de ${resumen.membresia} es ₡${resumen.saldo_pendiente.toLocaleString('es-CR')}.`,
      }, tx)
      console.info(JSON.stringify({ level: 'info', event: 'business_audit', action: completado ? 'PAYMENT_COMPLETED' : 'PAYMENT_REGISTERED', paymentId: pago.id_pago.toString(), gymId: idGimnasio.toString() }))
      return { id_pago: pago.id_pago, resumen }
    })
  },
}
