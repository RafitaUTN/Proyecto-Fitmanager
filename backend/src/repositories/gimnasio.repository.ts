import { prisma } from '../lib/prisma'

export const gimnasioRepository = {
  async crearConAdmin(data: {
    gimnasio: { nombre: string; correo: string; telefono?: string; direccion?: string }
    admin: { nombre: string; apellido: string; correo: string; password_hash: string }
  }) {
    return prisma.$transaction(async (tx) => {
      const gimnasio = await tx.gimnasio.create({ data: data.gimnasio })
      const usuario = await tx.usuario.create({
        data: { ...data.admin, id_gimnasio: gimnasio.id_gimnasio, rol: 'Administrador' },
      })
      return { gimnasio, usuario }
    })
  },

  async buscarPorCorreo(correo: string) {
    return prisma.gimnasio.findUnique({ where: { correo } })
  },
}
