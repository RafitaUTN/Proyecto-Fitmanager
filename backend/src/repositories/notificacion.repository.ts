import { prisma } from '../lib/prisma'
import type { TipoNotificacion } from '../generated/prisma/enums'

type NotifData = {
  id_cliente?: bigint
  id_gimnasio?: bigint
  id_solicitud?: bigint
  id_usuario_destino?: bigint
  rol_destino?: string
  accion_url?: string
  event_key?: string
  tipo?: TipoNotificacion
  titulo: string
  mensaje: string
}

export type NotificacionDb = Pick<typeof prisma, 'notificacion'>

type NotifInclude = {
  cliente: { select: { nombre: true; apellido: true } }
  solicitud: { select: { id: true; estado: true } }
}

function include(): NotifInclude {
  return {
    cliente: { select: { nombre: true, apellido: true } },
    solicitud: { select: { id: true, estado: true } },
  }
}

export const notificacionRepository = {
  listarPorGimnasio(idGimnasio: bigint, tipo?: string) {
    const where: any = { id_gimnasio: idGimnasio }
    if (tipo) where.tipo = tipo as TipoNotificacion
    return prisma.notificacion.findMany({
      where,
      include: include(),
      orderBy: { fecha_envio: 'desc' },
    })
  },

  listarPorUsuario(idUsuario: bigint, tipo?: string) {
    const where: any = { id_usuario_destino: idUsuario }
    if (tipo) where.tipo = tipo as TipoNotificacion
    return prisma.notificacion.findMany({
      where,
      include: include(),
      orderBy: { fecha_envio: 'desc' },
    })
  },

  listarPorClienteEntrenador(idEntrenador: bigint, idGimnasio: bigint, tipo?: string) {
    const where: any = {
      OR: [
        { id_usuario_destino: idEntrenador },
        { cliente: { id_entrenador: idEntrenador, id_gimnasio: idGimnasio } },
      ],
    }
    if (tipo) where.tipo = tipo as TipoNotificacion
    return prisma.notificacion.findMany({
      where,
      include: include(),
      orderBy: { fecha_envio: 'desc' },
    })
  },

  listarAdmin(idGimnasio: bigint, tipo?: string) {
    return this.listarPorRol(idGimnasio, 'Administrador', tipo)
  },

  listarRecepcion(idGimnasio: bigint, tipo?: string) {
    return this.listarPorRol(idGimnasio, 'Recepcionista', tipo)
  },

  listarPorRol(idGimnasio: bigint, rol: string, tipo?: string) {
    const where: any = { id_gimnasio: idGimnasio, OR: [{ rol_destino: rol }, { rol_destino: null }] }
    if (tipo) where.tipo = tipo as TipoNotificacion
    return prisma.notificacion.findMany({ where, include: include(), orderBy: { fecha_envio: 'desc' } })
  },

  listarEntrenador(idEntrenador: bigint, idGimnasio: bigint, tipo?: string) {
    return this.listarPorUsuario(idEntrenador, tipo)
  },

  listarCliente(idCliente: bigint, idGimnasio: bigint, tipo?: string) {
    const where: any = { id_cliente: idCliente, cliente: { id_gimnasio: idGimnasio } }
    if (tipo) where.tipo = tipo as TipoNotificacion
    return prisma.notificacion.findMany({ where, include: include(), orderBy: { fecha_envio: 'desc' } })
  },

  contarNoLeidasAdmin(idGimnasio: bigint) {
    return prisma.notificacion.count({
      where: { id_gimnasio: idGimnasio, leida: false, OR: [{ rol_destino: 'Administrador' }, { rol_destino: null }] },
    })
  },

  contarNoLeidasEntrenador(idEntrenador: bigint, idGimnasio: bigint) {
    return prisma.notificacion.count({
      where: {
        id_usuario_destino: idEntrenador,
        leida: false,
      },
    })
  },

  contarNoLeidasRecepcion(idGimnasio: bigint) {
    return prisma.notificacion.count({ where: { id_gimnasio: idGimnasio, leida: false, OR: [{ rol_destino: 'Recepcionista' }, { rol_destino: null }] } })
  },

  contarNoLeidasCliente(idCliente: bigint, idGimnasio: bigint) {
    return prisma.notificacion.count({ where: { id_cliente: idCliente, cliente: { id_gimnasio: idGimnasio }, leida: false } })
  },

  crear(data: NotifData, db: NotificacionDb = prisma) {
    return db.notificacion.create({ data })
  },

  crearMuchas(data: NotifData[], db: NotificacionDb = prisma) {
    return db.notificacion.createMany({ data, skipDuplicates: true })
  },

  marcarLeida(id: bigint) {
    return prisma.notificacion.update({
      where: { id_notificacion: id },
      data: { leida: true },
    })
  },
}
