import { prisma } from '../lib/prisma'

export const clienteRepository = {
  listarPorGimnasio(idGimnasio: bigint, limite = 50) {
    return prisma.cliente.findMany({
      where: { id_gimnasio: idGimnasio },
      orderBy: { fecha_registro: 'desc' },
      take: limite,
    })
  },

  listarPorEntrenador(idEntrenador: bigint, idGimnasio: bigint) {
    return prisma.cliente.findMany({
      where: { id_entrenador: idEntrenador, id_gimnasio: idGimnasio },
      orderBy: { fecha_registro: 'desc' },
    })
  },

  buscarPorId(id: bigint) {
    return prisma.cliente.findUnique({ where: { id_cliente: id } })
  },

  buscarPorCedula(cedula: string) {
    return prisma.cliente.findUnique({ where: { cedula } })
  },

  buscarPorNombre(termino: string, idGimnasio: bigint) {
    return prisma.cliente.findMany({
      where: {
        id_gimnasio: idGimnasio,
        OR: [
          { nombre: { contains: termino, mode: 'insensitive' } },
          { apellido: { contains: termino, mode: 'insensitive' } },
          { cedula: { contains: termino } },
        ],
      },
      orderBy: { nombre: 'asc' },
    })
  },

  buscarPorNombreEntrenador(termino: string, idEntrenador: bigint, idGimnasio: bigint) {
    return prisma.cliente.findMany({
      where: {
        id_gimnasio: idGimnasio,
        id_entrenador: idEntrenador,
        OR: [
          { nombre: { contains: termino, mode: 'insensitive' } },
          { apellido: { contains: termino, mode: 'insensitive' } },
          { cedula: { contains: termino } },
        ],
      },
      orderBy: { nombre: 'asc' },
    })
  },

  buscarPorCorreo(correo: string) {
    return prisma.cliente.findUnique({ where: { correo } })
  },

  crear(data: { id_gimnasio: bigint; id_entrenador?: bigint; nombre: string; apellido: string; cedula: string; telefono?: string; correo: string; fecha_nacimiento?: Date }) {
    return prisma.cliente.create({ data })
  },

  actualizar(id: bigint, data: { nombre?: string; apellido?: string; cedula?: string; telefono?: string; correo?: string; fecha_nacimiento?: Date; estado?: boolean; id_gimnasio?: bigint; id_entrenador?: bigint | null }) {
    return prisma.cliente.update({ where: { id_cliente: id }, data })
  },

  eliminar(id: bigint) {
    return prisma.cliente.delete({ where: { id_cliente: id } })
  },
}
