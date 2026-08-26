/**
 * Repositorio de datos del módulo cliente.repository.
 *
 * @remarks Encapsula consultas Prisma y preserva la separación entre acceso a datos y reglas de negocio.
 */
import { prisma } from '../lib/prisma'

const clienteListSelect = {
  id_cliente: true,
  id_gimnasio: true,
  id_entrenador: true,
  nombre: true,
  apellido: true,
  cedula: true,
  telefono: true,
  correo: true,
  fecha_nacimiento: true,
  fecha_registro: true,
  estado: true,
  contrasena_temporal: true,
  ultimo_acceso: true,
} as const

export const clienteRepository = {
  listarPorGimnasio(idGimnasio: bigint, limite = 50) {
    return prisma.cliente.findMany({
      where: { id_gimnasio: idGimnasio },
      select: clienteListSelect,
      orderBy: { fecha_registro: 'desc' },
      take: limite,
    })
  },

  async listarPorGimnasioPaginado(
    idGimnasio: bigint,
    page: number,
    pageSize: number,
    search?: string,
    idEntrenador?: bigint,
  ) {
    const where: any = {
      id_gimnasio: idGimnasio,
      ...(idEntrenador ? { id_entrenador: idEntrenador } : {}),
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' } },
              { apellido: { contains: search, mode: 'insensitive' } },
              { cedula: { contains: search } },
              { correo: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [data, totalItems] = await Promise.all([
      prisma.cliente.findMany({
        where,
        select: clienteListSelect,
        orderBy: { fecha_registro: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.cliente.count({ where }),
    ])
    return { data, totalItems }
  },

  listarSugerencias(idGimnasio: bigint, idEntrenador?: bigint, limite = 5) {
    const baseWhere = {
      id_gimnasio: idGimnasio,
      ...(idEntrenador ? { id_entrenador: idEntrenador } : {}),
    }
    return prisma.cliente.findMany({
      where: baseWhere,
      select: clienteListSelect,
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
      select: clienteListSelect,
      orderBy: { fecha_registro: 'desc' },
      take: limite,
    })
  },

  listarPorEntrenador(idEntrenador: bigint, idGimnasio: bigint) {
    return prisma.cliente.findMany({
      where: {
        id_entrenador: idEntrenador,
        id_gimnasio: idGimnasio,
        cliente_membresias: { some: { estado: 'activo' } },
      },
      select: clienteListSelect,
      orderBy: { fecha_registro: 'desc' },
    })
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
      select: clienteListSelect,
      orderBy: { nombre: 'asc' },
    })
  },

  buscarPorNombreEntrenador(termino: string, idEntrenador: bigint, idGimnasio: bigint) {
    return prisma.cliente.findMany({
      where: {
        id_gimnasio: idGimnasio,
        id_entrenador: idEntrenador,
        cliente_membresias: { some: { estado: 'activo' } },
        OR: [
          { nombre: { contains: termino, mode: 'insensitive' } },
          { apellido: { contains: termino, mode: 'insensitive' } },
          { cedula: { contains: termino } },
        ],
      },
      select: clienteListSelect,
      orderBy: { nombre: 'asc' },
    })
  },

  buscarPorCorreo(correo: string) {
    return prisma.cliente.findUnique({ where: { correo } })
  },

  crear(data: {
    id_gimnasio: bigint
    id_entrenador?: bigint
    nombre: string
    apellido: string
    cedula: string
    telefono?: string
    correo: string
    fecha_nacimiento?: Date
  }) {
    return prisma.cliente.create({ data })
  },

  actualizar(
    id: bigint,
    data: {
      nombre?: string
      apellido?: string
      cedula?: string
      telefono?: string
      correo?: string
      fecha_nacimiento?: Date
      estado?: boolean
      id_gimnasio?: bigint
      id_entrenador?: bigint | null
    },
  ) {
    return prisma.cliente.update({ where: { id_cliente: id }, data })
  },

  eliminar(id: bigint) {
    return prisma.cliente.delete({ where: { id_cliente: id } })
  },
}
