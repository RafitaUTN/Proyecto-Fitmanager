import { prisma } from '../lib/prisma'

export const usuarioRepository = {
  listarPorGimnasio(idGimnasio: bigint, pagina = 1, limite = 20) {
    return prisma.usuario.findMany({
      where: { id_gimnasio: idGimnasio },
      select: { id_usuario: true, nombre: true, apellido: true, correo: true, rol: true, estado: true, fecha_creacion: true },
      orderBy: { fecha_creacion: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    })
  },

  contarPorGimnasio(idGimnasio: bigint) {
    return prisma.usuario.count({ where: { id_gimnasio: idGimnasio } })
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

  crear(data: { id_gimnasio: bigint; nombre: string; apellido: string; correo: string; password_hash: string; rol: string }) {
    return prisma.usuario.create({ data })
  },

  actualizar(id: bigint, data: { nombre?: string; apellido?: string; correo?: string; password_hash?: string; rol?: string; estado?: boolean }) {
    return prisma.usuario.update({ where: { id_usuario: id }, data })
  },

  eliminar(id: bigint) {
    return prisma.usuario.delete({ where: { id_usuario: id } })
  },
}
