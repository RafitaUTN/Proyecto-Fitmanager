import { prisma } from '../lib/prisma'

export const rutinaRepository = {
  listarPorGimnasio(idGimnasio: bigint, idEntrenador?: bigint) {
    return prisma.rutina.findMany({
      where: {
        id_gimnasio: idGimnasio,
        ...(idEntrenador
          ? { entrenadores: { some: { id_entrenador: idEntrenador } } }
          : {}),
      },
      include: {
        _count: { select: { cliente_rutinas: true, rutina_ejercicios: true, entrenadores: true } },
        creador: { select: { id_usuario: true, nombre: true, apellido: true } },
        entrenadores: {
          include: { entrenador: { select: { id_usuario: true, nombre: true, apellido: true } } },
        },
      },
      orderBy: { fecha_creacion: 'desc' },
    })
  },

  buscarPorId(id: bigint) {
    return prisma.rutina.findUnique({
      where: { id_rutina: id },
      include: {
        creador: { select: { id_usuario: true, nombre: true, apellido: true } },
        entrenadores: {
          include: { entrenador: { select: { id_usuario: true, nombre: true, apellido: true } } },
        },
        rutina_ejercicios: {
          include: { ejercicio: true },
          orderBy: { id_rutina: 'asc' },
        },
      },
    })
  },

  crear(data: {
    id_gimnasio: bigint
    id_usuario_creador: bigint
    nombre: string
    descripcion?: string
  }) {
    return prisma.rutina.create({ data })
  },

  actualizar(id: bigint, data: { nombre?: string; descripcion?: string }) {
    return prisma.rutina.update({ where: { id_rutina: id }, data })
  },

  eliminar(id: bigint) {
    return prisma.rutina.delete({ where: { id_rutina: id } })
  },

  // RutinaEjercicio
  agregarEjercicios(idRutina: bigint, ejercicios: { id_ejercicio: bigint; series: number; repeticiones: number; peso_sugerido?: number }[]) {
    return prisma.rutinaEjercicio.createMany({
      data: ejercicios.map((e) => ({
        id_rutina: idRutina,
        id_ejercicio: e.id_ejercicio,
        series: e.series,
        repeticiones: e.repeticiones,
        peso_sugerido: e.peso_sugerido ?? null,
      })),
    })
  },

  eliminarEjercicios(idRutina: bigint) {
    return prisma.rutinaEjercicio.deleteMany({ where: { id_rutina: idRutina } })
  },

  listarEjercicios(idRutina: bigint) {
    return prisma.rutinaEjercicio.findMany({
      where: { id_rutina: idRutina },
      include: { ejercicio: true },
    })
  },

  // RutinaEntrenador
  asignarEntrenador(idRutina: bigint, idEntrenador: bigint) {
    return prisma.rutinaEntrenador.create({
      data: { id_rutina: idRutina, id_entrenador: idEntrenador },
    })
  },

  removerEntrenador(idRutina: bigint, idEntrenador: bigint) {
    return prisma.rutinaEntrenador.delete({
      where: { id_rutina_id_entrenador: { id_rutina: idRutina, id_entrenador: idEntrenador } },
    })
  },

  listarEntrenadoresAsignados(idRutina: bigint) {
    return prisma.rutinaEntrenador.findMany({
      where: { id_rutina: idRutina },
      include: { entrenador: { select: { id_usuario: true, nombre: true, apellido: true, correo: true } } },
    })
  },

  // ClienteRutina
  buscarAsignacionActiva(idCliente: bigint, idRutina: bigint) {
    return prisma.clienteRutina.findFirst({
      where: { id_cliente: idCliente, id_rutina: idRutina, estado: 'activa' },
    })
  },

  asignarCliente(data: {
    id_cliente: bigint
    id_rutina: bigint
    id_entrenador_asignador?: bigint
    fecha_asignacion: Date
    estado: string
  }) {
    return prisma.clienteRutina.create({ data })
  },

  listarAsignaciones(idRutina: bigint) {
    return prisma.clienteRutina.findMany({
      where: { id_rutina: idRutina },
      include: {
        cliente: { select: { id_cliente: true, nombre: true, apellido: true, cedula: true } },
        asignador: { select: { id_usuario: true, nombre: true, apellido: true } },
      },
      orderBy: { fecha_asignacion: 'desc' },
    })
  },
}
