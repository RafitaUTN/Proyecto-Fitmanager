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

// Constructores de `where` compartidos: la consulta paginada y su conteo tienen
// que filtrar exactamente igual o el total no corresponderia a las paginas.
function whereGimnasio(idGimnasio: bigint, tipo?: string) {
  const where: any = { id_gimnasio: idGimnasio }
  if (tipo) where.tipo = tipo as TipoNotificacion
  return where
}

function whereUsuario(idUsuario: bigint, tipo?: string) {
  const where: any = { id_usuario_destino: idUsuario }
  if (tipo) where.tipo = tipo as TipoNotificacion
  return where
}

function whereRol(idGimnasio: bigint, rol: string, tipo?: string) {
  const where: any = {
    id_gimnasio: idGimnasio,
    OR: [{ rol_destino: rol }, { rol_destino: null }],
  }
  if (tipo) where.tipo = tipo as TipoNotificacion
  return where
}

function whereCliente(idCliente: bigint, idGimnasio: bigint, tipo?: string) {
  const where: any = { id_cliente: idCliente, cliente: { id_gimnasio: idGimnasio } }
  if (tipo) where.tipo = tipo as TipoNotificacion
  return where
}

function pagina(where: any, numeroPagina: number, limite: number) {
  return prisma.notificacion.findMany({
    where,
    include: include(),
    orderBy: { fecha_envio: 'desc' },
    skip: (numeroPagina - 1) * limite,
    take: limite,
  })
}

export const notificacionRepository = {
  listarPorGimnasio(idGimnasio: bigint, tipo?: string, numeroPagina = 1, limite = 20) {
    return pagina(whereGimnasio(idGimnasio, tipo), numeroPagina, limite)
  },

  contarPorGimnasio(idGimnasio: bigint, tipo?: string) {
    return prisma.notificacion.count({ where: whereGimnasio(idGimnasio, tipo) })
  },

  listarPorUsuario(idUsuario: bigint, tipo?: string, numeroPagina = 1, limite = 20) {
    return pagina(whereUsuario(idUsuario, tipo), numeroPagina, limite)
  },

  contarPorUsuario(idUsuario: bigint, tipo?: string) {
    return prisma.notificacion.count({ where: whereUsuario(idUsuario, tipo) })
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
    return this.listarPorGimnasio(idGimnasio, tipo)
  },

  listarRecepcion(idGimnasio: bigint, tipo?: string, numeroPagina = 1, limite = 20) {
    return this.listarPorRol(idGimnasio, 'Recepcionista', tipo, numeroPagina, limite)
  },

  contarRecepcion(idGimnasio: bigint, tipo?: string) {
    return this.contarPorRol(idGimnasio, 'Recepcionista', tipo)
  },

  listarPorRol(idGimnasio: bigint, rol: string, tipo?: string, numeroPagina = 1, limite = 20) {
    return pagina(whereRol(idGimnasio, rol, tipo), numeroPagina, limite)
  },

  contarPorRol(idGimnasio: bigint, rol: string, tipo?: string) {
    return prisma.notificacion.count({ where: whereRol(idGimnasio, rol, tipo) })
  },

  listarEntrenador(idEntrenador: bigint, idGimnasio: bigint, tipo?: string, numeroPagina = 1, limite = 20) {
    return this.listarPorUsuario(idEntrenador, tipo, numeroPagina, limite)
  },

  contarEntrenador(idEntrenador: bigint, _idGimnasio: bigint, tipo?: string) {
    return this.contarPorUsuario(idEntrenador, tipo)
  },

  listarCliente(idCliente: bigint, idGimnasio: bigint, tipo?: string, numeroPagina = 1, limite = 20) {
    return pagina(whereCliente(idCliente, idGimnasio, tipo), numeroPagina, limite)
  },

  contarCliente(idCliente: bigint, idGimnasio: bigint, tipo?: string) {
    return prisma.notificacion.count({ where: whereCliente(idCliente, idGimnasio, tipo) })
  },

  contarNoLeidasAdmin(idGimnasio: bigint) {
    return prisma.notificacion.count({ where: { id_gimnasio: idGimnasio, leida: false } })
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

  crearUnaVez(data: NotifData, db: NotificacionDb = prisma) {
    return db.notificacion.createMany({ data: [data], skipDuplicates: true })
  },

  // Refresca (upsert) una notificación identificada por event_key. Útil para
  // alertas agregadas cuyo contenido cambia (ej: conteo de membresías por vencer).
  crearOSiExiste(data: NotifData, db: NotificacionDb = prisma) {
    const { event_key, ...resto } = data
    return db.notificacion.upsert({
      where: { event_key: event_key ?? '' },
      update: {
        ...resto,
        leida: false,
        fecha_envio: new Date(),
      },
      create: { ...resto, event_key },
    })
  },

  marcarLeida(id: bigint) {
    return prisma.notificacion.update({
      where: { id_notificacion: id },
      data: { leida: true },
    })
  },

  marcarLeidaCliente(id: bigint, idCliente: bigint, idGimnasio: bigint) {
    return prisma.notificacion.updateMany({
      where: { id_notificacion: id, id_cliente: idCliente, cliente: { id_gimnasio: idGimnasio } },
      data: { leida: true },
    })
  },
}
