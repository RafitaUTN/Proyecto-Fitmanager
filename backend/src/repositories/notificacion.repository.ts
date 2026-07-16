import { prisma } from '../lib/prisma'

export const notificacionRepository = {
  listarPorGimnasio(idGimnasio: bigint) {
    return prisma.notificacion.findMany({
      where: { cliente: { id_gimnasio: idGimnasio } },
      include: { cliente: { select: { nombre: true, apellido: true } } },
      orderBy: { fecha_envio: 'desc' },
    })
  },

  noLeidasPorGimnasio(idGimnasio: bigint) {
    return prisma.notificacion.count({
      where: { cliente: { id_gimnasio: idGimnasio }, leida: false },
    })
  },

  crear(data: { id_cliente: bigint; titulo: string; mensaje: string }) {
    return prisma.notificacion.create({ data })
  },

  marcarLeida(id: bigint) {
    return prisma.notificacion.update({ where: { id_notificacion: id }, data: { leida: true } })
  },

  crearMuchas(data: { id_cliente: bigint; titulo: string; mensaje: string }[]) {
    return prisma.notificacion.createMany({ data })
  },
}
