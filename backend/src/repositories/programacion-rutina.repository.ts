/**
 * Repositorio de programación de rutinas.
 *
 * @remarks Encapsula consultas Prisma de calendario para que los servicios
 * concentren reglas de negocio, concurrencia, RBAC y multi-tenant.
 */
import { prisma } from '../lib/prisma'

export type ProgramacionRutinaDb = Pick<
  typeof prisma,
  | 'programacionRutina'
  | 'programacionRutinaCliente'
  | 'programacionRutinaNivel'
  | 'rutina'
  | 'usuario'
  | 'cliente'
>

export type FiltrosProgramacion = {
  desde: Date
  hasta: Date
  id_entrenador?: bigint
  id_rutina?: bigint
  nivel?: string
  estado?: string
}

export const programacionRutinaInclude = {
  rutina: { select: { id_rutina: true, nombre: true, descripcion: true, duracion_minutos: true, dificultad: true } },
  entrenador: { select: { id_usuario: true, nombre: true, apellido: true } },
  clientes: { include: { cliente: { select: { id_cliente: true, nombre: true, apellido: true, nivel: true } } } },
  niveles: true,
} as const

function whereListado(idGimnasio: bigint, filtros: FiltrosProgramacion) {
  return {
    id_gimnasio: idGimnasio,
    fecha: { gte: filtros.desde, lte: filtros.hasta },
    ...(filtros.id_entrenador ? { id_entrenador: filtros.id_entrenador } : {}),
    ...(filtros.id_rutina ? { id_rutina: filtros.id_rutina } : {}),
    ...(filtros.estado ? { estado: filtros.estado as any } : {}),
    ...(filtros.nivel ? { niveles: { some: { nivel: filtros.nivel as any } } } : {}),
  }
}

export const programacionRutinaRepository = {
  buscarPorId(id: bigint, idGimnasio: bigint, db: ProgramacionRutinaDb = prisma) {
    return db.programacionRutina.findFirst({
      where: { id_programacion: id, id_gimnasio: idGimnasio },
      include: programacionRutinaInclude,
    })
  },

  async listar(idGimnasio: bigint, filtros: FiltrosProgramacion, page: number, pageSize: number) {
    const where = whereListado(idGimnasio, filtros)
    const [data, total] = await Promise.all([
      prisma.programacionRutina.findMany({
        where,
        include: programacionRutinaInclude,
        orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.programacionRutina.count({ where }),
    ])
    return { data, total }
  },

  conflictosEntrenador(
    idGimnasio: bigint,
    idEntrenador: bigint,
    inicio: Date,
    fin: Date,
    excluirId?: bigint,
    db: ProgramacionRutinaDb = prisma,
  ) {
    return db.programacionRutina.findMany({
      where: {
        id_gimnasio: idGimnasio,
        id_entrenador: idEntrenador,
        estado: { not: 'CANCELADA' },
        hora_inicio: { lt: fin },
        hora_fin: { gt: inicio },
        ...(excluirId ? { id_programacion: { not: excluirId } } : {}),
      },
      select: { id_programacion: true, hora_inicio: true, hora_fin: true },
      take: 1,
    })
  },

  conflictosClientes(
    idGimnasio: bigint,
    idsClientes: bigint[],
    inicio: Date,
    fin: Date,
    excluirId?: bigint,
    db: ProgramacionRutinaDb = prisma,
  ) {
    if (idsClientes.length === 0) return Promise.resolve([])
    return db.programacionRutinaCliente.findMany({
      where: {
        id_cliente: { in: idsClientes },
        programacion: {
          id_gimnasio: idGimnasio,
          estado: { not: 'CANCELADA' },
          hora_inicio: { lt: fin },
          hora_fin: { gt: inicio },
          ...(excluirId ? { id_programacion: { not: excluirId } } : {}),
        },
      },
      select: { id_cliente: true, id_programacion: true },
      take: 1,
    })
  },
}
