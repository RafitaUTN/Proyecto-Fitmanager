import { prisma } from '../lib/prisma'
import type { TipoNotificacion } from '../generated/prisma/enums'

export const notificacionRepository = {
  listarPorGimnasio(idGimnasio: bigint, tipo?: string) {
    const where: any = {
      OR: [
        { cliente: { id_gimnasio: idGimnasio } },
        { id_gimnasio: idGimnasio },
      ],
    }
    if (tipo) where.tipo = tipo

    return prisma.notificacion.findMany({
      where,
      include: {
        cliente: { select: { nombre: true, apellido: true } },
        solicitud: { select: { id: true, estado: true } },
      },
      orderBy: { fecha_envio: 'desc' },
    })
  },

  noLeidasPorGimnasio(idGimnasio: bigint) {
    return prisma.notificacion.count({
      where: {
        OR: [
          { cliente: { id_gimnasio: idGimnasio } },
          { id_gimnasio: idGimnasio },
        ],
        leida: false,
      },
    })
  },

  buscarDuplicada(data: {
    id_cliente?: bigint
    id_gimnasio?: bigint
    id_solicitud?: bigint
    tipo?: TipoNotificacion
    titulo: string
    mensaje: string
  }) {
    return prisma.notificacion.findFirst({
      where: {
        id_cliente: data.id_cliente,
        id_gimnasio: data.id_gimnasio,
        id_solicitud: data.id_solicitud,
        tipo: data.tipo,
        titulo: data.titulo,
        mensaje: data.mensaje,
      },
    })
  },

  crearSiNoExiste(data: {
    id_cliente?: bigint
    id_gimnasio?: bigint
    id_solicitud?: bigint
    tipo?: TipoNotificacion
    titulo: string
    mensaje: string
  }) {
    return this.buscarDuplicada(data).then((existente) => {
      if (existente) return existente
      return prisma.notificacion.create({ data })
    })
  },

  crear(data: {
    id_cliente?: bigint
    id_gimnasio?: bigint
    id_solicitud?: bigint
    tipo?: TipoNotificacion
    titulo: string
    mensaje: string
  }) {
    return prisma.notificacion.create({ data })
  },

  marcarLeida(id: bigint) {
    return prisma.notificacion.update({ where: { id_notificacion: id }, data: { leida: true } })
  },

  crearMuchas(data: {
    id_cliente?: bigint
    id_gimnasio?: bigint
    titulo: string
    mensaje: string
  }[]) {
    return prisma.notificacion.createMany({ data })
  },
}
