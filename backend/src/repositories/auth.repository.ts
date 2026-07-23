import { prisma } from '../lib/prisma'

export const authRepository = {
  buscarPorCorreo(correo: string) {
    return prisma.usuario.findUnique({ where: { correo } })
  },

  guardarRefreshToken(id_usuario: bigint, token_hash: string, expira_en: Date) {
    return prisma.refreshToken.create({ data: { id_usuario, token_hash, expira_en } })
  },

  buscarRefreshToken(token_hash: string) {
    return prisma.refreshToken.findUnique({ where: { token_hash } })
  },

  eliminarRefreshToken(token_hash: string) {
    return prisma.refreshToken.delete({ where: { token_hash } })
  },

  limpiarRefreshTokensUsuario(id_usuario: bigint) {
    return prisma.refreshToken.deleteMany({ where: { id_usuario } })
  },
}
