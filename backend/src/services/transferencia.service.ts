import { prisma } from '../lib/prisma'
import { transferenciaRepository } from '../repositories/transferencia.repository'
import { notificationFactory } from './notification-factory.service'
import { notificacionService } from './notificacion.service'
import { AppError } from '../lib/errors'
import type { CrearSolicitudDto } from '../dtos/transferencia.dto'

function esUnico(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

export const transferenciaService = {
  async listar(idGimnasio: bigint, estado?: string, rol?: string) {
    const vencidas = await transferenciaRepository.expirarVencidas()
    if (vencidas.length > 0) {
      const ids = vencidas.map(v => v.id)
      await transferenciaRepository.expirarMasivamente(ids)
      for (const v of vencidas) {
        await notificacionService.crear({
          tipo: 'TRANSFERENCIA',
          destino: { id_gimnasio: v.id_gym_origen, rol_destino: 'Administrador', id_solicitud: v.id },
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
    if (!solicitud) throw Object.assign(new Error('Solicitud no encontrada'), { statusCode: 404 })
    if (solicitud.id_gym_origen !== idGimnasio && solicitud.id_gym_destino !== idGimnasio) {
      throw Object.assign(new Error('Acceso denegado a esta solicitud'), { statusCode: 403 })
    }
    return solicitud
  },

  async crear(idGimnasioDestino: bigint, dto: CrearSolicitudDto, idUsuario: number, ip?: string) {
    const idCliente = BigInt(dto.id_cliente)
    try {
      return await prisma.$transaction(async (tx) => {
        const solicitante = await tx.usuario.findFirst({
          where: { id_usuario: BigInt(idUsuario), id_gimnasio: idGimnasioDestino, estado: true },
          select: { id_usuario: true },
        })
        if (!solicitante) throw Object.assign(new Error('Usuario solicitante no autorizado'), { statusCode: 403 })

        const cliente = await tx.cliente.findUnique({ where: { id_cliente: idCliente } })
        if (!cliente) throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
        if (cliente.id_gimnasio === idGimnasioDestino) {
          throw Object.assign(new Error('El cliente ya pertenece a este gimnasio'), { statusCode: 400 })
        }
        const pendiente = await tx.solicitudTransferencia.findFirst({
          where: { id_cliente: idCliente, estado: 'PENDIENTE' },
          select: { id: true },
        })
        if (pendiente) {
          throw Object.assign(new Error('Ya existe una solicitud de transferencia pendiente para este cliente'), { statusCode: 409 })
        }

        const result = await tx.solicitudTransferencia.create({
          data: {
            id_cliente: idCliente,
            id_gym_origen: cliente.id_gimnasio,
            id_gym_destino: idGimnasioDestino,
            id_usuario_solicita: BigInt(idUsuario),
            motivo: dto.motivo,
            ip_solicitud: ip,
          },
        })
        await notificationFactory.crearMultiple([
          {
            tipo: 'TRANSFERENCIA',
            destino: { id_gimnasio: cliente.id_gimnasio, rol_destino: 'Administrador', id_solicitud: result.id },
            titulo: 'Nueva solicitud de transferencia',
            mensaje: `Se ha solicitado la transferencia de ${cliente.nombre} ${cliente.apellido} a otro gimnasio.`,
          },
          {
            tipo: 'TRANSFERENCIA',
            destino: { id_gimnasio: idGimnasioDestino, rol_destino: 'Administrador', id_solicitud: result.id },
            titulo: 'Solicitud de transferencia recibida',
            mensaje: `Se ha recibido una solicitud para transferir a ${cliente.nombre} ${cliente.apellido} a este gimnasio.`,
          },
        ], tx)
        await tx.solicitudAuditoria.create({
          data: {
            id_solicitud: result.id,
            accion: 'CREADA',
            id_usuario: BigInt(idUsuario),
            ip,
            estado_nuevo: 'PENDIENTE',
            observaciones: dto.motivo,
          },
        })
        return result
      })
    } catch (error) {
      if (esUnico(error)) {
        throw Object.assign(new Error('Ya existe una solicitud de transferencia pendiente para este cliente'), { statusCode: 409 })
      }
      throw error
    }
  },

  async aprobar(id: bigint, idGimnasioOrigen: bigint, idUsuario: number, observaciones: string, ip?: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM solicitud_transferencia WHERE id = ${id} FOR UPDATE`
      const solicitud = await tx.solicitudTransferencia.findUnique({
        where: { id },
        include: { cliente: { select: { nombre: true, apellido: true, id_gimnasio: true } } },
      })
      if (!solicitud) throw Object.assign(new Error('Solicitud no encontrada'), { statusCode: 404 })
      if (solicitud.id_gym_origen !== idGimnasioOrigen) {
        throw Object.assign(new Error('No tienes permiso para aprobar esta solicitud'), { statusCode: 403 })
      }
      if (solicitud.estado !== 'PENDIENTE') {
        throw Object.assign(new Error(`La solicitud no puede ser aprobada porque su estado es ${solicitud.estado}`), { statusCode: 409 })
      }
      if (solicitud.cliente.id_gimnasio !== solicitud.id_gym_origen) {
        throw new AppError('El cliente ya no pertenece al gimnasio de origen.', 409, 'CLIENTE_CAMBIO_TENANT')
      }

      const pagosPendientes = await tx.pago.findMany({
        where: {
          id_cliente: solicitud.id_cliente,
          id_gimnasio: solicitud.id_gym_origen,
          estado: { in: ['pendiente', 'vencido', 'moroso'] },
        },
        select: { monto: true },
      })
      if (pagosPendientes.length > 0) {
        throw new AppError('No es posible aprobar la transferencia porque el cliente posee pagos pendientes.', 400, 'PAGOS_PENDIENTES', {
          cantidad: pagosPendientes.length,
          monto_total: pagosPendientes.reduce((total, pago) => total + Number(pago.monto), 0),
        })
      }

      await tx.clienteMembresia.updateMany({
        where: { id_cliente: solicitud.id_cliente, estado: 'activo' },
        data: { estado: 'cancelada' },
      })
      await tx.clienteRutina.updateMany({
        where: { id_cliente: solicitud.id_cliente, estado: { in: ['activa', 'activo'] } },
        data: { estado: 'archivada' },
      })
      await tx.cliente.update({
        where: { id_cliente: solicitud.id_cliente, id_gimnasio: solicitud.id_gym_origen },
        data: { id_gimnasio: solicitud.id_gym_destino, id_entrenador: null, estado: true },
      })
      await tx.solicitudTransferencia.update({
        where: { id },
        data: {
          estado: 'APROBADA', id_usuario_respuesta: BigInt(idUsuario), fecha_respuesta: new Date(),
          observaciones, ip_respuesta: ip,
        },
      })
      const nombre = `${solicitud.cliente.nombre} ${solicitud.cliente.apellido}`
      await notificationFactory.crearMultiple([
        {
          tipo: 'TRANSFERENCIA', destino: { id_gimnasio: solicitud.id_gym_origen, rol_destino: 'Administrador', id_solicitud: id },
          titulo: 'Transferencia aprobada', mensaje: `La transferencia de ${nombre} fue aprobada y el cliente salió de este gimnasio.`,
        },
        {
          tipo: 'TRANSFERENCIA', destino: { id_gimnasio: solicitud.id_gym_destino, rol_destino: 'Administrador', id_solicitud: id },
          titulo: 'Transferencia aprobada', mensaje: `La transferencia de ${nombre} fue aprobada. El cliente ya puede administrarse desde este gimnasio.`,
        },
      ], tx)
      await tx.solicitudAuditoria.create({
        data: {
          id_solicitud: id, accion: 'APROBADA', id_usuario: BigInt(idUsuario), ip,
          estado_anterior: 'PENDIENTE', estado_nuevo: 'APROBADA', observaciones,
        },
      })
      return tx.solicitudTransferencia.findUnique({ where: { id } })
    })
  },

  async rechazar(id: bigint, idGimnasioOrigen: bigint, idUsuario: number, observaciones: string, ip?: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM solicitud_transferencia WHERE id = ${id} FOR UPDATE`
      const solicitud = await tx.solicitudTransferencia.findUnique({ where: { id } })
      if (!solicitud) throw Object.assign(new Error('Solicitud no encontrada'), { statusCode: 404 })
      if (solicitud.id_gym_origen !== idGimnasioOrigen) {
        throw Object.assign(new Error('No tienes permiso para rechazar esta solicitud'), { statusCode: 403 })
      }
      if (solicitud.estado !== 'PENDIENTE') {
        throw Object.assign(new Error(`La solicitud no puede ser rechazada porque su estado es ${solicitud.estado}`), { statusCode: 409 })
      }
      await tx.solicitudTransferencia.update({
        where: { id },
        data: { estado: 'RECHAZADA', id_usuario_respuesta: BigInt(idUsuario), fecha_respuesta: new Date(), observaciones, ip_respuesta: ip },
      })
      await notificationFactory.crearMultiple([
        { tipo: 'TRANSFERENCIA', destino: { id_gimnasio: solicitud.id_gym_origen, rol_destino: 'Administrador', id_solicitud: id }, titulo: 'Transferencia rechazada', mensaje: `La solicitud fue rechazada. Motivo: ${observaciones}` },
        { tipo: 'TRANSFERENCIA', destino: { id_gimnasio: solicitud.id_gym_destino, rol_destino: 'Administrador', id_solicitud: id }, titulo: 'Transferencia rechazada', mensaje: `La solicitud fue rechazada. Motivo: ${observaciones}` },
      ], tx)
      await tx.solicitudAuditoria.create({ data: { id_solicitud: id, accion: 'RECHAZADA', id_usuario: BigInt(idUsuario), ip, estado_anterior: 'PENDIENTE', estado_nuevo: 'RECHAZADA', observaciones } })
      return tx.solicitudTransferencia.findUnique({ where: { id } })
    })
  },

  async cancelar(id: bigint, idGimnasioDestino: bigint, idUsuario: number, ip?: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM solicitud_transferencia WHERE id = ${id} FOR UPDATE`
      const solicitud = await tx.solicitudTransferencia.findUnique({ where: { id } })
      if (!solicitud) throw Object.assign(new Error('Solicitud no encontrada'), { statusCode: 404 })
      if (solicitud.id_gym_destino !== idGimnasioDestino) {
        throw Object.assign(new Error('No tienes permiso para cancelar esta solicitud'), { statusCode: 403 })
      }
      if (solicitud.estado !== 'PENDIENTE') {
        throw Object.assign(new Error(`La solicitud no puede ser cancelada porque su estado es ${solicitud.estado}`), { statusCode: 409 })
      }
      await tx.solicitudTransferencia.update({
        where: { id },
        data: { estado: 'CANCELADA', id_usuario_respuesta: BigInt(idUsuario), fecha_respuesta: new Date(), ip_respuesta: ip },
      })
      await notificationFactory.crearMultiple([
        { tipo: 'TRANSFERENCIA', destino: { id_gimnasio: solicitud.id_gym_origen, rol_destino: 'Administrador', id_solicitud: id }, titulo: 'Solicitud cancelada', mensaje: 'La solicitud fue cancelada por el gimnasio destino.' },
        { tipo: 'TRANSFERENCIA', destino: { id_gimnasio: solicitud.id_gym_destino, rol_destino: 'Administrador', id_solicitud: id }, titulo: 'Solicitud cancelada', mensaje: 'La solicitud de transferencia fue cancelada.' },
      ], tx)
      await tx.solicitudAuditoria.create({ data: { id_solicitud: id, accion: 'CANCELADA', id_usuario: BigInt(idUsuario), ip, estado_anterior: 'PENDIENTE', estado_nuevo: 'CANCELADA' } })
      return tx.solicitudTransferencia.findUnique({ where: { id } })
    })
  },

  async indicadores(idGimnasio: bigint) {
    const [recibidas, enviadas] = await Promise.all([
      transferenciaRepository.contarRecibidas(idGimnasio),
      transferenciaRepository.contarEnviadas(idGimnasio),
    ])
    return { recibidas, enviadas }
  },
}
