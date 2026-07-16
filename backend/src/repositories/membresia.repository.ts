import { prisma } from '../lib/prisma'

export const membresiaRepository = {
  listarPorGimnasio(idGimnasio: bigint) {
    return prisma.membresia.findMany({
      where: { id_gimnasio: idGimnasio },
      orderBy: { precio: 'asc' },
    })
  },

  buscarPorId(id: bigint) {
    return prisma.membresia.findUnique({ where: { id_membresia: id } })
  },

  crear(data: { id_gimnasio: bigint; nombre: string; descripcion?: string; precio: number; duracion_dias: number }) {
    return prisma.membresia.create({ data })
  },

  actualizar(id: bigint, data: { nombre?: string; descripcion?: string; precio?: number; duracion_dias?: number; estado?: boolean }) {
    return prisma.membresia.update({ where: { id_membresia: id }, data })
  },
}
