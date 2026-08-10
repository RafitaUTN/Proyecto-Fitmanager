import { prisma } from '../lib/prisma'

export type RutinaDb = Pick<
  typeof prisma,
  'rutina' | 'rutinaEjercicio' | 'rutinaEntrenador' | 'clienteRutina' | 'clienteRutinaEjercicio'
>

const rutinaInclude = {
  creador: { select: { id_usuario: true, nombre: true, apellido: true } },
  entrenadores: {
    include: { entrenador: { select: { id_usuario: true, nombre: true, apellido: true } } },
  },
  rutina_ejercicios: { include: { ejercicio: true }, orderBy: { orden: 'asc' as const } },
} as const

export const rutinaRepository = {
  listarPorGimnasio(idGimnasio: bigint, idEntrenador?: bigint, db: RutinaDb = prisma) {
    return db.rutina.findMany({
      where: {
        id_gimnasio: idGimnasio,
        ...(idEntrenador
          ? { entrenadores: { some: { id_entrenador: idEntrenador, estado: true } } }
          : {}),
      },
      include: {
        _count: { select: { cliente_rutinas: true, rutina_ejercicios: true, entrenadores: true } },
        creador: { select: { id_usuario: true, nombre: true, apellido: true } },
        entrenadores: {
          include: { entrenador: { select: { id_usuario: true, nombre: true, apellido: true } } },
        },
        rutina_ejercicios: {
          orderBy: { orden: 'asc' },
          take: 3,
          select: { ejercicio: { select: { id_ejercicio: true, nombre: true, imagen_url: true, animacion_url: true, tipo_media: true } } },
        },
      },
      orderBy: { fecha_creacion: 'desc' },
    })
  },

  buscarPorId(id: bigint, idGimnasio: bigint, idEntrenador?: bigint, db: RutinaDb = prisma) {
    return db.rutina.findFirst({
      where: {
        id_rutina: id,
        id_gimnasio: idGimnasio,
        ...(idEntrenador
          ? { entrenadores: { some: { id_entrenador: idEntrenador, estado: true } } }
          : {}),
      },
      include: rutinaInclude,
    })
  },

  crear(data: { id_gimnasio: bigint; id_usuario_creador: bigint; nombre: string; descripcion?: string; objetivo?: string; duracion_minutos?: number; dificultad?: string }, db: RutinaDb = prisma) {
    return db.rutina.create({ data })
  },

  actualizar(id: bigint, data: { nombre?: string; descripcion?: string; objetivo?: string; duracion_minutos?: number; dificultad?: string; estado?: boolean }, db: RutinaDb = prisma) {
    return db.rutina.update({ where: { id_rutina: id }, data })
  },

  eliminar(id: bigint, db: RutinaDb = prisma) {
    return db.rutina.delete({ where: { id_rutina: id } })
  },

  agregarEjercicios(idRutina: bigint, ejercicios: { id_ejercicio: bigint; series: number; repeticiones: number; peso_sugerido?: number; descanso?: number; notas?: string; orden?: number }[], db: RutinaDb = prisma) {
    return db.rutinaEjercicio.createMany({
      data: ejercicios.map((e) => ({
        id_rutina: idRutina,
        id_ejercicio: e.id_ejercicio,
        series: e.series,
        repeticiones: e.repeticiones,
        peso_sugerido: e.peso_sugerido ?? null,
        descanso: e.descanso ?? null,
        notas: e.notas ?? null,
        orden: e.orden ?? 0,
      })),
    })
  },

  eliminarEjercicios(idRutina: bigint, db: RutinaDb = prisma) {
    return db.rutinaEjercicio.deleteMany({ where: { id_rutina: idRutina } })
  },

  asignarEntrenador(idRutina: bigint, idEntrenador: bigint, db: RutinaDb = prisma) {
    return db.rutinaEntrenador.create({ data: { id_rutina: idRutina, id_entrenador: idEntrenador } })
  },

  removerEntrenador(idRutina: bigint, idEntrenador: bigint, db: RutinaDb = prisma) {
    return db.rutinaEntrenador.delete({
      where: { id_rutina_id_entrenador: { id_rutina: idRutina, id_entrenador: idEntrenador } },
    })
  },

  listarEntrenadoresAsignados(idRutina: bigint, idGimnasio: bigint, db: RutinaDb = prisma) {
    return db.rutinaEntrenador.findMany({
      where: { id_rutina: idRutina, rutina: { id_gimnasio: idGimnasio } },
      include: { entrenador: { select: { id_usuario: true, nombre: true, apellido: true, correo: true } } },
    })
  },

  buscarAsignacionActiva(idCliente: bigint, idRutina: bigint, idGimnasio: bigint, db: RutinaDb = prisma) {
    return db.clienteRutina.findFirst({
      where: {
        id_cliente: idCliente,
        id_rutina: idRutina,
        estado: 'activa',
        cliente: { id_gimnasio: idGimnasio },
        rutina: { id_gimnasio: idGimnasio },
      },
    })
  },

  listarAsignaciones(idRutina: bigint, idGimnasio: bigint, idEntrenador?: bigint, db: RutinaDb = prisma) {
    return db.clienteRutina.findMany({
      where: {
        id_rutina: idRutina,
        rutina: { id_gimnasio: idGimnasio },
        cliente: {
          id_gimnasio: idGimnasio,
          ...(idEntrenador ? { id_entrenador: idEntrenador } : {}),
        },
      },
      include: {
        cliente: { select: { id_cliente: true, nombre: true, apellido: true, cedula: true } },
        asignador: { select: { id_usuario: true, nombre: true, apellido: true } },
      },
      orderBy: { fecha_asignacion: 'desc' },
    })
  },

  buscarClienteRutina(idClienteRutina: bigint, idGimnasio: bigint, idEntrenador?: bigint, db: RutinaDb = prisma) {
    return db.clienteRutina.findFirst({
      where: {
        id_cliente_rutina: idClienteRutina,
        cliente: {
          id_gimnasio: idGimnasio,
          ...(idEntrenador ? { id_entrenador: idEntrenador } : {}),
        },
        rutina: { id_gimnasio: idGimnasio },
      },
      include: {
        cliente: { select: { id_cliente: true, nombre: true, apellido: true } },
        rutina: { select: { id_rutina: true, nombre: true } },
        ejercicios: { orderBy: { orden: 'asc' } },
      },
    })
  },

  buscarEjercicioCliente(id: bigint, idGimnasio: bigint, idEntrenador?: bigint, db: RutinaDb = prisma) {
    return db.clienteRutinaEjercicio.findFirst({
      where: {
        id_cliente_rutina_ejercicio: id,
        cliente_rutina: {
          cliente: {
            id_gimnasio: idGimnasio,
            ...(idEntrenador ? { id_entrenador: idEntrenador } : {}),
          },
          rutina: { id_gimnasio: idGimnasio },
        },
      },
    })
  },

  actualizarEjercicioCliente(id: bigint, data: { series?: number; repeticiones?: number; peso?: number; descanso?: number; observaciones?: string; estado?: boolean }, db: RutinaDb = prisma) {
    return db.clienteRutinaEjercicio.update({ where: { id_cliente_rutina_ejercicio: id }, data })
  },

  actualizarClienteRutina(id: bigint, data: { fecha_inicio?: Date; fecha_fin?: Date; observaciones?: string; estado?: string }, db: RutinaDb = prisma) {
    return db.clienteRutina.update({ where: { id_cliente_rutina: id }, data })
  },

  listarRutinasDeCliente(idCliente: bigint, idGimnasio: bigint, idEntrenador?: bigint, db: RutinaDb = prisma) {
    return db.clienteRutina.findMany({
      where: {
        id_cliente: idCliente,
        cliente: {
          id_gimnasio: idGimnasio,
          ...(idEntrenador ? { id_entrenador: idEntrenador } : {}),
        },
        rutina: { id_gimnasio: idGimnasio },
      },
      include: {
        rutina: { select: { id_rutina: true, nombre: true } },
        ejercicios: { orderBy: { orden: 'asc' } },
      },
      orderBy: { fecha_asignacion: 'desc' },
    })
  },
}
