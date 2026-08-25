import { prisma } from '../lib/prisma'

// Where compartido entre cada pagina y su conteo: si divergieran, el total no
// correspondería a los registros mostrados.
function whereListado(idGimnasio: bigint, idEntrenador?: bigint) {
  return {
    id_gimnasio: idGimnasio,
    ...(idEntrenador
      ? { id_entrenador: idEntrenador, cliente_membresias: { some: { estado: 'activo' } } }
      : {}),
  }
}

function whereBusqueda(termino: string, idGimnasio: bigint, idEntrenador?: bigint) {
  return {
    ...whereListado(idGimnasio, idEntrenador),
    OR: [
      { nombre: { contains: termino, mode: 'insensitive' as const } },
      { apellido: { contains: termino, mode: 'insensitive' as const } },
      { cedula: { contains: termino } },
    ],
  }
}

export const clienteRepository = {
  listarPorGimnasio(idGimnasio: bigint, pagina = 1, limite = 20) {
    return prisma.cliente.findMany({
      where: whereListado(idGimnasio),
      orderBy: { fecha_registro: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    })
  },

  contarPorGimnasio(idGimnasio: bigint) {
    return prisma.cliente.count({ where: whereListado(idGimnasio) })
  },

  listarSugerencias(idGimnasio: bigint, idEntrenador?: bigint, limite = 5) {
    const baseWhere = {
      id_gimnasio: idGimnasio,
      ...(idEntrenador ? { id_entrenador: idEntrenador } : {}),
    }
    return prisma.cliente.findMany({
      where: baseWhere,
      orderBy: { fecha_registro: 'desc' },
      take: limite,
    })
  },

  listarSugerenciasSinMembresia(idGimnasio: bigint, excluirIds: bigint[], limite = 5, idEntrenador?: bigint) {
    return prisma.cliente.findMany({
      where: {
        id_gimnasio: idGimnasio,
        ...(idEntrenador ? { id_entrenador: idEntrenador } : {}),
        id_cliente: { notIn: excluirIds },
        cliente_membresias: { none: { estado: 'activo' } },
      },
      orderBy: { fecha_registro: 'desc' },
      take: limite,
    })
  },

  listarPorEntrenador(idEntrenador: bigint, idGimnasio: bigint, pagina = 1, limite = 20) {
    return prisma.cliente.findMany({
      where: whereListado(idGimnasio, idEntrenador),
      orderBy: { fecha_registro: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    })
  },

  contarPorEntrenador(idEntrenador: bigint, idGimnasio: bigint) {
    return prisma.cliente.count({ where: whereListado(idGimnasio, idEntrenador) })
  },

  buscarPorId(id: bigint) {
    return prisma.cliente.findUnique({ where: { id_cliente: id } })
  },

  buscarPorIdEnGimnasio(id: bigint, idGimnasio: bigint, idEntrenador?: bigint) {
    return prisma.cliente.findFirst({
      where: {
        id_cliente: id,
        id_gimnasio: idGimnasio,
        ...(idEntrenador
          ? {
              id_entrenador: idEntrenador,
              cliente_membresias: { some: { estado: 'activo' } },
            }
          : {}),
      },
    })
  },

  buscarPorCedula(cedula: string) {
    return prisma.cliente.findUnique({ where: { cedula } })
  },

  buscarPorCedulaConGimnasio(cedula: string) {
    return prisma.cliente.findUnique({
      where: { cedula },
      include: { gimnasio: { select: { nombre: true } } },
    })
  },

  buscarPorCedulaEnGimnasio(cedula: string, idGimnasio: bigint, idEntrenador?: bigint) {
    return prisma.cliente.findFirst({
      where: {
        cedula,
        id_gimnasio: idGimnasio,
        ...(idEntrenador
          ? {
              id_entrenador: idEntrenador,
              cliente_membresias: { some: { estado: 'activo' } },
            }
          : {}),
      },
    })
  },

  buscarPorNombre(termino: string, idGimnasio: bigint, pagina = 1, limite = 20) {
    return prisma.cliente.findMany({
      where: whereBusqueda(termino, idGimnasio),
      orderBy: { nombre: 'asc' },
      skip: (pagina - 1) * limite,
      take: limite,
    })
  },

  contarPorNombre(termino: string, idGimnasio: bigint) {
    return prisma.cliente.count({ where: whereBusqueda(termino, idGimnasio) })
  },

  buscarPorNombreEntrenador(termino: string, idEntrenador: bigint, idGimnasio: bigint, pagina = 1, limite = 20) {
    return prisma.cliente.findMany({
      where: whereBusqueda(termino, idGimnasio, idEntrenador),
      orderBy: { nombre: 'asc' },
      skip: (pagina - 1) * limite,
      take: limite,
    })
  },

  contarPorNombreEntrenador(termino: string, idEntrenador: bigint, idGimnasio: bigint) {
    return prisma.cliente.count({ where: whereBusqueda(termino, idGimnasio, idEntrenador) })
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
