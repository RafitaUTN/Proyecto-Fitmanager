import { prisma } from '../lib/prisma'

export type AuthDb = Pick<typeof prisma, 'usuario' | 'cliente' | 'refreshToken' | 'clienteRefreshToken'>

export const authRepository = {
  buscarPorCorreo(correo: string, db: AuthDb = prisma) {
    return db.usuario.findUnique({ where: { correo } })
  },

  guardarRefreshToken(id_usuario: bigint, token_hash: string, expira_en: Date, db: AuthDb = prisma) {
    return db.refreshToken.create({ data: { id_usuario, token_hash, expira_en } })
  },

  guardarRefreshTokenCliente(id_cliente: bigint, token_hash: string, expira_en: Date, db: AuthDb = prisma) {
    return db.clienteRefreshToken.create({ data: { id_cliente, token_hash, expira_en } })
  },

  buscarRefreshToken(token_hash: string, db: AuthDb = prisma) {
    return db.refreshToken.findUnique({ where: { token_hash } })
  },

  buscarRefreshTokenCliente(token_hash: string, db: AuthDb = prisma) {
    return db.clienteRefreshToken.findUnique({ where: { token_hash } })
  },

  eliminarRefreshToken(token_hash: string, db: AuthDb = prisma) {
    return db.refreshToken.deleteMany({ where: { token_hash } })
  },

  eliminarRefreshTokenCliente(token_hash: string, db: AuthDb = prisma) {
    return db.clienteRefreshToken.deleteMany({ where: { token_hash } })
  },

  limpiarRefreshTokensUsuario(id_usuario: bigint, db: AuthDb = prisma) {
    return db.refreshToken.deleteMany({ where: { id_usuario } })
  },

  limpiarRefreshTokensCliente(id_cliente: bigint, db: AuthDb = prisma) {
    return db.clienteRefreshToken.deleteMany({ where: { id_cliente } })
  },

  async limpiarExpirados() {
    const ahora = new Date()
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { expira_en: { lt: ahora } } }),
      prisma.clienteRefreshToken.deleteMany({ where: { expira_en: { lt: ahora } } }),
    ])
  },
}
