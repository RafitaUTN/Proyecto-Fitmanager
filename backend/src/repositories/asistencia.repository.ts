import { prisma } from '../lib/prisma'

export type AsistenciaDb = Pick<typeof prisma, 'asistencia'>

type Filtros = {
  id_cliente?: bigint
  fecha_inicio?: Date
  fecha_fin?: Date
  solo_dentro?: boolean
  id_entrenador?: bigint
}

function rangoHoy() {
  // El runtime opera en America/Costa_Rica; conservar límites locales evita
  // que el tablero mezcle jornadas al convertir prematuramente a UTC.
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const fin = new Date(inicio)
  fin.setHours(23, 59, 59, 999)
  return { inicio, fin }
}

function crearWhere(idGimnasio: bigint, filtros?: Filtros) {
  const where: any = { id_gimnasio: idGimnasio }
  if (filtros?.id_cliente) where.id_cliente = filtros.id_cliente
  if (filtros?.fecha_inicio && filtros?.fecha_fin) {
    where.fecha_hora_ingreso = { gte: filtros.fecha_inicio, lte: filtros.fecha_fin }
  } else if (filtros?.fecha_inicio) {
    where.fecha_hora_ingreso = { gte: filtros.fecha_inicio }
  } else if (filtros?.fecha_fin) {
    where.fecha_hora_ingreso = { lte: filtros.fecha_fin }
  }
  if (filtros?.solo_dentro) where.fecha_hora_salida = null
  if (filtros?.id_entrenador) where.cliente = { id_entrenador: filtros.id_entrenador }
  return where
}

export function whereElegibles(idGimnasio: bigint, hoy: Date) {
  return {
    id_gimnasio: idGimnasio,
    estado: true,
    cliente_membresias: {
      some: {
        estado: 'activo',
        fecha_inicio: { lte: hoy },
        fecha_fin: { gte: hoy },
      },
    },
    asistencias: { none: { fecha_hora_salida: null } },
  }
}

export const asistenciaRepository = {
  listarPorGimnasio(idGimnasio: bigint, filtros?: Filtros, pagina = 1, limite = 20, db: AsistenciaDb = prisma) {
    return db.asistencia.findMany({
      where: crearWhere(idGimnasio, filtros),
      include: {
        cliente: { select: { id_cliente: true, nombre: true, apellido: true, cedula: true, telefono: true } },
      },
      orderBy: { fecha_hora_ingreso: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    })
  },

  contarPorGimnasio(idGimnasio: bigint, filtros?: Filtros, db: AsistenciaDb = prisma) {
    return db.asistencia.count({ where: crearWhere(idGimnasio, filtros) })
  },

  buscarEntradaAbierta(idCliente: bigint, idGimnasio: bigint, db: AsistenciaDb = prisma) {
    return db.asistencia.findFirst({ where: { id_cliente: idCliente, id_gimnasio: idGimnasio, fecha_hora_salida: null } })
  },

  listarActivas(idGimnasio: bigint, db: AsistenciaDb = prisma) {
    return db.asistencia.findMany({
      where: { id_gimnasio: idGimnasio, fecha_hora_salida: null },
      include: { cliente: { select: { id_cliente: true, nombre: true, apellido: true, cedula: true, telefono: true } } },
      orderBy: { fecha_hora_ingreso: 'asc' },
    })
  },

  listarElegibles(idGimnasio: bigint) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return prisma.cliente.findMany({
      where: whereElegibles(idGimnasio, hoy),
      orderBy: { nombre: 'asc' },
      select: { id_cliente: true, nombre: true, apellido: true, cedula: true },
    })
  },

  buscarPorId(id: bigint, idGimnasio: bigint, db: AsistenciaDb = prisma) {
    return db.asistencia.findFirst({
      where: { id_asistencia: id, id_gimnasio: idGimnasio },
      include: { cliente: { select: { id_cliente: true, nombre: true, apellido: true, estado: true } } },
    })
  },

  crear(data: { id_gimnasio: bigint; id_cliente: bigint; fecha_hora_ingreso: Date }, db: AsistenciaDb = prisma) {
    return db.asistencia.create({ data })
  },

  actualizarSalidaSiAbierta(id: bigint, idGimnasio: bigint, fecha_hora_salida: Date, db: AsistenciaDb = prisma) {
    return db.asistencia.updateMany({
      where: { id_asistencia: id, id_gimnasio: idGimnasio, fecha_hora_salida: null },
      data: { fecha_hora_salida },
    })
  },

  contarHoy(idGimnasio: bigint) {
    const { inicio, fin } = rangoHoy()
    return prisma.asistencia.count({
      where: { id_gimnasio: idGimnasio, fecha_hora_ingreso: { gte: inicio, lte: fin } },
    })
  },

  contarPresentes(idGimnasio: bigint) {
    const { inicio, fin } = rangoHoy()
    return prisma.asistencia.count({
      where: {
        id_gimnasio: idGimnasio,
        fecha_hora_ingreso: { gte: inicio, lte: fin },
        fecha_hora_salida: null,
      },
    })
  },

  contarPresentesPorEntrenador(idEntrenador: bigint, idGimnasio: bigint) {
    const { inicio, fin } = rangoHoy()
    return prisma.asistencia.count({
      where: {
        id_gimnasio: idGimnasio,
        cliente: { id_entrenador: idEntrenador },
        fecha_hora_ingreso: { gte: inicio, lte: fin },
        fecha_hora_salida: null,
      },
    })
  },
}
