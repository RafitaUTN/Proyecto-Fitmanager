import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { hashToken } from '../lib/token-hash'
import { tokenService } from './token.service'
import { emailService } from '../email/email.service'
import { authRepository } from '../repositories/auth.repository'
import { AppError } from '../lib/errors'
import { notificationFactory } from './notification-factory.service'
import { recordSecurityAudit } from '../lib/security-audit'

const RESPUESTA_GENERICA = 'Si existe una cuenta activa con ese correo, recibirás instrucciones para restablecer la contraseña.'

export const passwordRecoveryService = {
  async solicitar(correo: string) {
    const [cliente, usuario] = await Promise.all([
      prisma.cliente.findFirst({
        where: { correo, estado: true, contrasena: { not: null }, gimnasio: { estado: true } },
        select: { id_cliente: true, nombre: true, correo: true },
      }),
      prisma.usuario.findFirst({
        where: { correo, estado: true, gimnasio: { estado: true } },
        select: { id_usuario: true, nombre: true, correo: true },
      }),
    ])
    // Un correo presente en ambas tablas es una identidad ambigua y no se debe resolver al azar.
    if ((!cliente && !usuario) || (cliente && usuario)) return { mensaje: RESPUESTA_GENERICA }
    const actor = cliente
      ? { actorType: 'CLIENTE' as const, actorId: cliente.id_cliente }
      : { actorType: 'STAFF' as const, actorId: usuario!.id_usuario }
    const destinatario = cliente ?? usuario!
    const token = await tokenService.crearRecuperacion(actor)
    try {
      await emailService.sendPasswordResetEmail(destinatario, token)
    } catch {
      console.error('[email] Falló el envío de recuperación tras agotar reintentos')
    }
    return { mensaje: RESPUESTA_GENERICA }
  },

  async restablecer(token: string, password: string) {
    const tokenHash = hashToken(token)
    const passwordHash = await bcrypt.hash(password, 12)
    const actor = await prisma.$transaction(async (tx) => {
      const record = await tx.token.findUnique({ where: { token_hash: tokenHash } })
      if (!record || record.tipo !== 'RECUPERACION' || record.usado_en || record.expira_en < new Date()) {
        throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
      }
      const consumido = await tx.token.updateMany({
        where: { id: record.id, tipo: 'RECUPERACION', usado_en: null, expira_en: { gt: new Date() } },
        data: { usado_en: new Date() },
      })
      if (consumido.count !== 1) throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
      if (record.id_cliente) {
        const cliente = await tx.cliente.update({
          where: { id_cliente: record.id_cliente },
          data: { contrasena: passwordHash, contrasena_temporal: false },
          select: { id_cliente: true, id_gimnasio: true },
        })
        await authRepository.limpiarRefreshTokensCliente(record.id_cliente, tx)
        await notificationFactory.crear({
          tipo: 'SISTEMA',
          destino: { id_cliente: record.id_cliente },
          titulo: 'Contraseña restablecida',
          mensaje: 'Tu contraseña se restableció correctamente. Todas las sesiones anteriores fueron cerradas.',
        }, tx)
        return { actorType: 'CLIENTE' as const, actorId: cliente.id_cliente, gymId: cliente.id_gimnasio }
      }
      if (record.id_usuario) {
        const usuario = await tx.usuario.update({
          where: { id_usuario: record.id_usuario },
          data: { password_hash: passwordHash },
          select: { id_usuario: true, id_gimnasio: true },
        })
        await authRepository.limpiarRefreshTokensUsuario(record.id_usuario, tx)
        await notificationFactory.crear({
          tipo: 'SISTEMA',
          destino: { id_usuario_destino: record.id_usuario },
          titulo: 'Contraseña restablecida',
          mensaje: 'Tu contraseña se restableció correctamente. Todas las sesiones anteriores fueron cerradas.',
        }, tx)
        return { actorType: 'STAFF' as const, actorId: usuario.id_usuario, gymId: usuario.id_gimnasio }
      }
      throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
    })
    recordSecurityAudit('PASSWORD_RESET', actor)
    return { mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' }
  },
}
