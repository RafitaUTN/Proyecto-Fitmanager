import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { hashToken } from '../lib/token-hash'
import { tokenService } from './token.service'
import { emailService } from '../email/email.service'
import { authRepository } from '../repositories/auth.repository'
import { AppError } from '../lib/errors'

const RESPUESTA_GENERICA = 'Si existe una cuenta activa con ese correo, recibirás instrucciones para restablecer la contraseña.'

export const passwordRecoveryService = {
  async solicitar(correo: string) {
    const cliente = await prisma.cliente.findFirst({
      where: { correo, estado: true, contrasena: { not: null }, gimnasio: { estado: true } },
      select: { id_cliente: true, nombre: true, correo: true },
    })
    if (!cliente) return { mensaje: RESPUESTA_GENERICA }
    const token = await tokenService.crearRecuperacion(cliente.id_cliente)
    try {
      await emailService.sendPasswordResetEmail(cliente, token)
    } catch {
      console.error('[email] Falló el envío de recuperación tras agotar reintentos')
    }
    return { mensaje: RESPUESTA_GENERICA }
  },

  async restablecer(token: string, password: string) {
    const tokenHash = hashToken(token)
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.$transaction(async (tx) => {
      const record = await tx.token.findUnique({ where: { token_hash: tokenHash } })
      if (!record || record.tipo !== 'RECUPERACION' || record.usado_en || record.expira_en < new Date()) {
        throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
      }
      const consumido = await tx.token.updateMany({
        where: { id: record.id, tipo: 'RECUPERACION', usado_en: null, expira_en: { gt: new Date() } },
        data: { usado_en: new Date() },
      })
      if (consumido.count !== 1) throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
      await tx.cliente.update({ where: { id_cliente: record.id_cliente }, data: { contrasena: passwordHash } })
      await authRepository.limpiarRefreshTokensCliente(record.id_cliente, tx)
    })
    return { mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' }
  },
}
