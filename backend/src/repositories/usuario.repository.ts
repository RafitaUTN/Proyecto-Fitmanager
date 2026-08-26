/**
 * Repositorio de datos del módulo usuario.repository.
 *
 * @remarks Encapsula consultas Prisma y preserva la separación entre acceso a datos y reglas de negocio.
 */
import { prisma } from '../lib/prisma'

export const usuarioRepository = {
  listarPorGimnasio(idGimnasio: bigint) {
    return prisma.usuario.findMany({
      where: { id_gimnasio: idGimnasio },
      select: {
        id_usuario: true,
        nombre: true,
        apellido: true,
        correo: true,
        rol: true,
        estado: true,
        fecha_creacion: true,
      },
      orderBy: { fecha_creacion: 'desc' },
    })
  },

  async listarPorGimnasioPaginado(idGimnasio: bigint, page: number, pageSize: number, search?: string) {
    const where: any = {
      id_gimnasio: idGimnasio,
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' } },
              { apellido: { contains: search, mode: 'insensitive' } },
              { correo: { contains: search, mode: 'insensitive' } },
              { rol: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [data, totalItems] = await Promise.all([
      prisma.usuario.findMany({
        where,
        select: {
          id_usuario: true,
          nombre: true,
          apellido: true,
          correo: true,
          rol: true,
          estado: true,
          fecha_creacion: true,
        },
        orderBy: { fecha_creacion: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.usuario.count({ where }),
    ])
    return { data, totalItems }
  },

  buscarPorId(id: bigint) {
    return prisma.usuario.findUnique({ where: { id_usuario: id } })
  },

  buscarPerfil(id: bigint) {
    return prisma.usuario.findUnique({
      where: { id_usuario: id },
      include: {
        gimnasio: { select: { nombre: true } },
      },
    })
  },

  buscarPorCorreo(correo: string) {
    return prisma.usuario.findUnique({ where: { correo } })
  },

  crear(data: {
    id_gimnasio: bigint
    nombre: string
    apellido: string
    correo: string
    password_hash: string
    rol: string
  }) {
    return prisma.usuario.create({ data })
  },

  actualizar(
    id: bigint,
    data: {
      nombre?: string
      apellido?: string
      correo?: string
      password_hash?: string
      rol?: string
      estado?: boolean
    },
  ) {
    return prisma.usuario.update({ where: { id_usuario: id }, data })
  },

  eliminar(id: bigint) {
    return prisma.usuario.delete({ where: { id_usuario: id } })
  },
}
