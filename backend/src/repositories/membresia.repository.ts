/**
 * Repositorio de datos del módulo membresia.repository.
 *
 * @remarks Encapsula consultas Prisma y preserva la separación entre acceso a datos y reglas de negocio.
 */
import { prisma } from '../lib/prisma'

export const membresiaRepository = {
  listarPorGimnasio(idGimnasio: bigint) {
    return prisma.membresia.findMany({
      where: { id_gimnasio: idGimnasio },
      orderBy: { precio: 'asc' },
    })
  },

  async listarPorGimnasioPaginado(idGimnasio: bigint, page: number, pageSize: number, search?: string) {
    const where = {
      id_gimnasio: idGimnasio,
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' as const } },
              { descripcion: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [data, totalItems] = await Promise.all([
      prisma.membresia.findMany({
        where,
        orderBy: { precio: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.membresia.count({ where }),
    ])

    return { data, totalItems }
  },

  buscarPorId(id: bigint) {
    return prisma.membresia.findUnique({ where: { id_membresia: id } })
  },

  crear(data: { id_gimnasio: bigint; nombre: string; descripcion?: string; precio: number; duracion_dias: number }) {
    return prisma.membresia.create({ data })
  },

  actualizar(
    id: bigint,
    data: { nombre?: string; descripcion?: string; precio?: number; duracion_dias?: number; estado?: boolean },
  ) {
    return prisma.membresia.update({ where: { id_membresia: id }, data })
  },

  eliminar(id: bigint) {
    return prisma.membresia.delete({ where: { id_membresia: id } })
  },
}
