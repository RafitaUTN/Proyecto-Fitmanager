import { prisma } from '../lib/prisma'

export const authRepository = {
  buscarPorCorreo(correo: string) {
    return prisma.usuario.findUnique({ where: { correo } })
  },

  guardarRefreshToken(id_usuario: bigint, token: string, expira_en: Date) {
    return prisma.refreshToken.create({ data: { id_usuario, token, expira_en } })
  },

  buscarRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({ where: { token } })
  },

  eliminarRefreshToken(token: string) {
    return prisma.refreshToken.delete({ where: { token } })
  },

  limpiarRefreshTokensUsuario(id_usuario: bigint) {
    return prisma.refreshToken.deleteMany({ where: { id_usuario } })
  },
}
