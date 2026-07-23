import { prisma } from '../lib/prisma'
import { transferenciaRepository } from '../repositories/transferencia.repository'
import { notificacionService } from './notificacion.service'
import type { CrearSolicitudDto } from '../dtos/transferencia.dto'

export const transferenciaService = {
  async listar(idGimnasio: bigint, estado?: string, rol?: string) {
    const vencidas = await transferenciaRepository.expirarVencidas()
    if (vencidas.length > 0) {
      const ids = vencidas.map(v => v.id)
      await transferenciaRepository.expirarMasivamente(ids)
      for (const v of vencidas) {
        await notificacionService.crearNotificacion({
          id_gimnasio: v.id_gym_origen,
          id_solicitud: v.id,
          tipo: 'TRANSFERENCIA',
          titulo: 'Solicitud expirada',
          mensaje: 'La solicitud de transferencia ha expirado por falta de respuesta (30 días).',
        })
        await transferenciaRepository.crearAuditoria({
          id_solicitud: v.id,
          accion: 'EXPIRADA',
          estado_anterior: 'PENDIENTE',
          estado_nuevo: 'CANCELADA',
          observaciones: 'Expirada automáticamente por falta de respuesta en 30 días.',
        })
      }
    }
    return transferenciaRepository.listar(idGimnasio, estado, rol)
  },

  async buscar(id: bigint, idGimnasio: bigint) {
    const solicitud = await transferenciaRepository.buscarPorId(id)
    if (!solicitud) {
      throw Object.assign(new Error('Solicitud no encontrada'), { statusCode: 404 })
    }
    if (solicitud.id_gym_origen !== idGimnasio && solicitud.id_gym_destino !== idGimnasio) {
      throw Object.assign(new Error('Acceso denegado a esta solicitud'), { statusCode: 403 })
    }
    return solicitud
  },

  async crear(idGimnasioDestino: bigint, dto: CrearSolicitudDto, idUsuario: number, ip?: string) {
    const idCliente = BigInt(dto.id_cliente)

    const cliente = await prisma.cliente.findUnique({ where: { id_cliente: idCliente } })
    if (!cliente) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }
    if (!cliente.estado) {
      throw Object.assign(new Error('El cliente está inactivo'), { statusCode: 400 })
    }
    if (cliente.id_gimnasio === idGimnasioDestino) {
      throw Object.assign(new Error('El cliente ya pertenece a este gimnasio'), { statusCode: 400 })
    }

    const pendiente = await transferenciaRepository.buscarPendientePorCliente(idCliente)
    if (pendiente) {
      throw Object.assign(new Error('Ya existe una solicitud de transferencia pendiente para este cliente'), { statusCode: 409 })
    }

    const result = await transferenciaRepository.crear({
      id_cliente: idCliente,
      id_gym_origen: cliente.id_gimnasio,
      id_gym_destino: idGimnasioDestino,
      id_usuario_solicita: BigInt(idUsuario),
      motivo: dto.motivo,
      ip_solicitud: ip,
    })

    await notificacionService.crearNotificacion({
      id_gimnasio: cliente.id_gimnasio,
      id_solicitud: result.id,
      tipo: 'TRANSFERENCIA',
      titulo: 'Nueva solicitud de transferencia',
      mensaje: `Se ha solicitado la transferencia de ${cliente.nombre} ${cliente.apellido} a otro gimnasio.`,
    })

    await transferenciaRepository.crearAuditoria({
      id_solicitud: result.id,
      accion: 'CREADA',
      id_usuario: BigInt(idUsuario),
      ip,
      estado_nuevo: 'PENDIENTE',
      observaciones: dto.motivo,
    })

    return result
  },

  async aprobar(id: bigint, idGimnasioOrigen: bigint, idUsuario: number, observaciones: string, ip?: string) {
    const solicitud = await transferenciaRepository.buscarPorId(id)
    if (!solicitud) {
      throw Object.assign(new Error('Solicitud no encontrada'), { statusCode: 404 })
    }
    if (solicitud.id_gym_origen !== idGimnasioOrigen) {
      throw Object.assign(new Error('No tienes permiso para aprobar esta solicitud'), { statusCode: 403 })
    }
    if (solicitud.estado !== 'PENDIENTE') {
      throw Object.assign(new Error(`La solicitud no puede ser aprobada porque su estado es ${solicitud.estado}`), { statusCode: 400 })
    }

    const pagosPendientes = await prisma.pago.findMany({
      where: {
        id_cliente: solicitud.id_cliente,
        estado: { in: ['pendiente', 'vencido', 'moroso'] },
      },
    })
    if (pagosPendientes.length > 0) {
      throw Object.assign(new Error(JSON.stringify({
        codigo: 'PAGOS_PENDIENTES',
        error: 'No es posible aprobar la transferencia porque el cliente posee pagos pendientes.',
        cantidad: pagosPendientes.length,
        monto_total: Number(pagosPendientes.reduce((a, b) => a + Number(b.monto), 0)),
        pagos: pagosPendientes,
      })), { statusCode: 400 })
    }

    return prisma.$transaction(async (tx) => {
      await tx.cliente.update({
        where: { id_cliente: solicitud.id_cliente },
        data: { estado: false },
      })

      await tx.clienteMembresia.updateMany({
        where: { id_cliente: solicitud.id_cliente, estado: 'activo' },
        data: { estado: 'cancelada' },
      })

      await tx.cliente.update({
        where: { id_cliente: solicitud.id_cliente },
        data: { id_gimnasio: solicitud.id_gym_destino, estado: true },
      })

      await tx.solicitudTransferencia.update({
        where: { id },
        data: {
          estado: 'APROBADA',
          id_usuario_respuesta: BigInt(idUsuario),
          fecha_respuesta: new Date(),
          observaciones,
          ip_respuesta: ip,
        },
      })

      await tx.notificacion.create({
        data: {
          id_gimnasio: solicitud.id_gym_destino,
          id_solicitud: id,
          tipo: 'TRANSFERENCIA',
          titulo: 'Transferencia aprobada',
          mensaje: `La transferencia de ${solicitud.cliente?.nombre || ''} ${solicitud.cliente?.apellido || ''} ha sido aprobada. El cliente ya puede ser administrado desde este gimnasio.`,
        },
      })

      await tx.solicitudAuditoria.create({
        data: {
          id_solicitud: id,
          accion: 'APROBADA',
          id_usuario: BigInt(idUsuario),
          ip,
          estado_anterior: 'PENDIENTE',
          estado_nuevo: 'APROBADA',
          observaciones,
        },
      })

      return tx.solicitudTransferencia.findUnique({ where: { id } })
    })
  },

  async rechazar(id: bigint, idGimnasioOrigen: bigint, idUsuario: number, observaciones: string, ip?: string) {
    const solicitud = await transferenciaRepository.buscarPorId(id)
    if (!solicitud) {
      throw Object.assign(new Error('Solicitud no encontrada'), { statusCode: 404 })
    }
    if (solicitud.id_gym_origen !== idGimnasioOrigen) {
      throw Object.assign(new Error('No tienes permiso para rechazar esta solicitud'), { statusCode: 403 })
    }
    if (solicitud.estado !== 'PENDIENTE') {
      throw Object.assign(new Error(`La solicitud no puede ser rechazada porque su estado es ${solicitud.estado}`), { statusCode: 400 })
    }

    return prisma.$transaction(async (tx) => {
      await tx.solicitudTransferencia.update({
        where: { id },
        data: {
          estado: 'RECHAZADA',
          id_usuario_respuesta: BigInt(idUsuario),
          fecha_respuesta: new Date(),
          observaciones,
          ip_respuesta: ip,
        },
      })

      await tx.notificacion.create({
        data: {
          id_gimnasio: solicitud.id_gym_destino,
          id_solicitud: id,
          tipo: 'TRANSFERENCIA',
          titulo: 'Transferencia rechazada',
          mensaje: `La transferencia ha sido rechazada. Motivo: ${observaciones}`,
        },
      })

      await tx.solicitudAuditoria.create({
        data: {
          id_solicitud: id,
          accion: 'RECHAZADA',
          id_usuario: BigInt(idUsuario),
          ip,
          estado_anterior: 'PENDIENTE',
          estado_nuevo: 'RECHAZADA',
          observaciones,
        },
      })

      return tx.solicitudTransferencia.findUnique({ where: { id } })
    })
  },

  async cancelar(id: bigint, idGimnasioDestino: bigint, idUsuario: number, ip?: string) {
    const solicitud = await transferenciaRepository.buscarPorId(id)
    if (!solicitud) {
      throw Object.assign(new Error('Solicitud no encontrada'), { statusCode: 404 })
    }
    if (solicitud.id_gym_destino !== idGimnasioDestino) {
      throw Object.assign(new Error('No tienes permiso para cancelar esta solicitud'), { statusCode: 403 })
    }
    if (solicitud.estado !== 'PENDIENTE') {
      throw Object.assign(new Error(`La solicitud no puede ser cancelada porque su estado es ${solicitud.estado}`), { statusCode: 400 })
    }

    return prisma.$transaction(async (tx) => {
      await tx.solicitudTransferencia.update({
        where: { id },
        data: {
          estado: 'CANCELADA',
          id_usuario_respuesta: BigInt(idUsuario),
          fecha_respuesta: new Date(),
          ip_respuesta: ip,
        },
      })

      await tx.notificacion.create({
        data: {
          id_gimnasio: solicitud.id_gym_origen,
          id_solicitud: id,
          tipo: 'TRANSFERENCIA',
          titulo: 'Solicitud cancelada',
          mensaje: 'La solicitud de transferencia ha sido cancelada por el gimnasio destino.',
        },
      })

      await tx.solicitudAuditoria.create({
        data: {
          id_solicitud: id,
          accion: 'CANCELADA',
          id_usuario: BigInt(idUsuario),
          ip,
          estado_anterior: 'PENDIENTE',
          estado_nuevo: 'CANCELADA',
        },
      })

      return tx.solicitudTransferencia.findUnique({ where: { id } })
    })
  },

  async indicadores(idGimnasio: bigint) {
    const recibidas = await transferenciaRepository.contarRecibidas(idGimnasio)
    const enviadas = await transferenciaRepository.contarEnviadas(idGimnasio)
    return { recibidas, enviadas }
  },
}
