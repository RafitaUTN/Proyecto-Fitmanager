import { prisma } from '../lib/prisma'

export const ejercicioRepository = {
  listar(idGimnasio: bigint) {
    return prisma.ejercicio.findMany({
      where: { id_gimnasio: idGimnasio },
      include: { _count: { select: { rutina_ejercicios: true } } },
      orderBy: { nombre: 'asc' },
    })
  },

  buscarPorId(id: bigint) {
    return prisma.ejercicio.findUnique({ where: { id_ejercicio: id } })
  },

  listarPorIds(ids: bigint[], idGimnasio: bigint) {
    return prisma.ejercicio.findMany({
      where: { id_ejercicio: { in: ids }, id_gimnasio: idGimnasio },
    })
  },

  crear(data: {
    id_gimnasio: bigint
    nombre: string
    grupo_muscular: string
    descripcion?: string
    nivel?: string
    categoria?: string
  }) {
    return prisma.ejercicio.create({ data })
  },

  actualizar(id: bigint, data: {
    nombre?: string
    grupo_muscular?: string
    descripcion?: string
    nivel?: string
    categoria?: string
    estado?: boolean
  }) {
    return prisma.ejercicio.update({ where: { id_ejercicio: id }, data })
  },

  eliminar(id: bigint) {
    return prisma.ejercicio.delete({ where: { id_ejercicio: id } })
  },

  estaEnUso(id: bigint) {
    return prisma.rutinaEjercicio.findFirst({ where: { id_ejercicio: id } })
  },
}
