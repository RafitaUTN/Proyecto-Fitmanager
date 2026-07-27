import { prisma } from '../lib/prisma'

export const asistenciaRepository = {
  listarPorGimnasio(
    idGimnasio: bigint,
    filtros?: {
      id_cliente?: bigint
      fecha_inicio?: Date
      fecha_fin?: Date
      solo_dentro?: boolean
      id_entrenador?: bigint
    },
    pagina = 1,
    limite = 20,
  ) {
    const where: any = { cliente: { id_gimnasio: idGimnasio } }

    if (filtros?.id_cliente) {
      where.id_cliente = filtros.id_cliente
    }
    if (filtros?.fecha_inicio && filtros?.fecha_fin) {
      where.fecha_hora_ingreso = { gte: filtros.fecha_inicio, lte: filtros.fecha_fin }
    } else if (filtros?.fecha_inicio) {
      where.fecha_hora_ingreso = { gte: filtros.fecha_inicio }
    } else if (filtros?.fecha_fin) {
      where.fecha_hora_ingreso = { lte: filtros.fecha_fin }
    }
    if (filtros?.solo_dentro) {
      where.fecha_hora_salida = null
    }
    if (filtros?.id_entrenador) {
      where.cliente.id_entrenador = filtros.id_entrenador
    }

    return prisma.asistencia.findMany({
      where,
      include: {
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            apellido: true,
            cedula: true,
            telefono: true,
          },
        },
      },
      orderBy: { fecha_hora_ingreso: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    })
  },

  contarPorGimnasio(
    idGimnasio: bigint,
    filtros?: {
      id_cliente?: bigint
      fecha_inicio?: Date
      fecha_fin?: Date
      solo_dentro?: boolean
      id_entrenador?: bigint
    },
  ) {
    const where: any = { cliente: { id_gimnasio: idGimnasio } }

    if (filtros?.id_cliente) where.id_cliente = filtros.id_cliente
    if (filtros?.fecha_inicio && filtros?.fecha_fin) {
      where.fecha_hora_ingreso = { gte: filtros.fecha_inicio, lte: filtros.fecha_fin }
    } else if (filtros?.fecha_inicio) {
      where.fecha_hora_ingreso = { gte: filtros.fecha_inicio }
    } else if (filtros?.fecha_fin) {
      where.fecha_hora_ingreso = { lte: filtros.fecha_fin }
    }
    if (filtros?.solo_dentro) where.fecha_hora_salida = null
    if (filtros?.id_entrenador) where.cliente.id_entrenador = filtros.id_entrenador

    return prisma.asistencia.count({ where })
  },

  buscarEntradaHoy(idCliente: bigint) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const finDelDia = new Date(hoy)
    finDelDia.setHours(23, 59, 59, 999)

    return prisma.asistencia.findFirst({
      where: {
        id_cliente: idCliente,
        fecha_hora_ingreso: { gte: hoy, lte: finDelDia },
        fecha_hora_salida: null,
      },
    })
  },

  buscarPorId(id: bigint) {
    return prisma.asistencia.findUnique({
      where: { id_asistencia: id },
      include: {
        cliente: {
          select: { id_gimnasio: true, id_cliente: true, nombre: true, apellido: true, estado: true },
        },
      },
    })
  },

  crear(data: { id_cliente: bigint; fecha_hora_ingreso: Date }) {
    return prisma.asistencia.create({ data })
  },

  actualizarSalida(id: bigint, fecha_hora_salida: Date) {
    return prisma.asistencia.update({
      where: { id_asistencia: id },
      data: { fecha_hora_salida },
    })
  },

  // Dashboard helpers
  contarHoy(idGimnasio: bigint) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const finDelDia = new Date(hoy)
    finDelDia.setHours(23, 59, 59, 999)

    return prisma.asistencia.count({
      where: {
        cliente: { id_gimnasio: idGimnasio },
        fecha_hora_ingreso: { gte: hoy, lte: finDelDia },
      },
    })
  },

  contarPresentes(idGimnasio: bigint) {
    return prisma.asistencia.count({
      where: {
        cliente: { id_gimnasio: idGimnasio },
        fecha_hora_salida: null,
      },
    })
  },

  contarPresentesPorEntrenador(idEntrenador: bigint) {
    return prisma.asistencia.count({
      where: {
        cliente: { id_entrenador: idEntrenador },
        fecha_hora_salida: null,
      },
    })
  },
}
