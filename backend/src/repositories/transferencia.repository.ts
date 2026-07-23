import { prisma } from '../lib/prisma'
import { EstadoSolicitud } from '../generated/prisma/enums'

export const transferenciaRepository = {
  listar(idGimnasio: bigint, estado?: string, rol?: string) {
    const where: any = {
      OR: [
        { id_gym_origen: idGimnasio },
        { id_gym_destino: idGimnasio },
      ],
    }
    if (estado) where.estado = estado
    if (rol === 'origen') where.OR = [{ id_gym_origen: idGimnasio }]
    if (rol === 'destino') where.OR = [{ id_gym_destino: idGimnasio }]

    return prisma.solicitudTransferencia.findMany({
      where,
      include: {
        cliente: { select: { id_cliente: true, nombre: true, apellido: true, cedula: true } },
        gym_origen: { select: { id_gimnasio: true, nombre: true } },
        gym_destino: { select: { id_gimnasio: true, nombre: true } },
        usuario_solicita: { select: { id_usuario: true, nombre: true, apellido: true } },
        usuario_respuesta: { select: { id_usuario: true, nombre: true, apellido: true } },
      },
      orderBy: { fecha_solicitud: 'desc' },
    })
  },

  buscarPorId(id: bigint) {
    return prisma.solicitudTransferencia.findUnique({
      where: { id },
      include: {
        cliente: { select: { id_cliente: true, nombre: true, apellido: true, cedula: true } },
        gym_origen: { select: { id_gimnasio: true, nombre: true } },
        gym_destino: { select: { id_gimnasio: true, nombre: true } },
        usuario_solicita: { select: { id_usuario: true, nombre: true, apellido: true } },
        usuario_respuesta: { select: { id_usuario: true, nombre: true, apellido: true } },
        notificaciones: { select: { id_notificacion: true, leida: true } },
        auditorias: { orderBy: { fecha: 'asc' } },
      },
    })
  },

  buscarPendientePorCliente(idCliente: bigint) {
    return prisma.solicitudTransferencia.findFirst({
      where: { id_cliente: idCliente, estado: 'PENDIENTE' },
    })
  },

  crear(data: {
    id_cliente: bigint
    id_gym_origen: bigint
    id_gym_destino: bigint
    id_usuario_solicita: bigint
    motivo?: string
    ip_solicitud?: string
  }) {
    return prisma.solicitudTransferencia.create({ data })
  },

  actualizarEstado(id: bigint, data: {
    estado: EstadoSolicitud
    id_usuario_respuesta?: bigint
    fecha_respuesta?: Date
    observaciones?: string
    ip_respuesta?: string
  }) {
    return prisma.solicitudTransferencia.update({ where: { id }, data: data as any })
  },

  expirarVencidas() {
    const fechaLimite = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return prisma.solicitudTransferencia.findMany({
      where: { estado: 'PENDIENTE', fecha_solicitud: { lt: fechaLimite } },
    })
  },

  expirarMasivamente(ids: bigint[]) {
    return prisma.solicitudTransferencia.updateMany({
      where: { id: { in: ids } },
      data: { estado: 'CANCELADA' },
    })
  },

  contarRecibidas(idGimnasio: bigint) {
    return prisma.solicitudTransferencia.count({
      where: { id_gym_destino: idGimnasio, estado: 'PENDIENTE' },
    })
  },

  contarEnviadas(idGimnasio: bigint) {
    return prisma.solicitudTransferencia.count({
      where: { id_gym_origen: idGimnasio, estado: 'PENDIENTE' },
    })
  },

  crearAuditoria(data: {
    id_solicitud: bigint
    accion: string
    id_usuario?: bigint
    ip?: string
    estado_anterior?: string
    estado_nuevo: string
    observaciones?: string
  }) {
    return prisma.solicitudAuditoria.create({ data })
  },
}
