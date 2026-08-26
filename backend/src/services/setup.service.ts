/**
 * Servicio de negocio del módulo setup.service.
 *
 * @remarks Contiene reglas del dominio FitManager y coordina repositorios, transacciones y efectos secundarios.
 */
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { hashToken } from '../lib/token-hash'
import { AppError } from '../lib/errors'
import { notificationFactory } from './notification-factory.service'

/**
 * Consume un token de activación y define la contraseña inicial del cliente.
 *
 * El token se busca por hash y se marca como usado dentro de la misma
 * transacción para impedir doble consumo si el enlace se envía dos veces o el
 * usuario hace doble clic. Solo los tokens de tipo ACTIVACION y no expirados
 * pueden activar una cuenta.
 *
 * @param token - Token plano recibido desde el enlace de activación.
 * @param password - Contraseña nueva ya validada por el DTO.
 * @returns Mensaje de confirmación para el controlador.
 */
async function activarPasswordCliente(token: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12)
  const tokenHash = hashToken(token)

  await prisma.$transaction(async (tx) => {
    const record = await tx.token.findUnique({ where: { token_hash: tokenHash } })
    if (!record || record.tipo !== 'ACTIVACION' || record.usado_en || record.expira_en < new Date()) {
      throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
    }

    const consumed = await tx.token.updateMany({
      where: { id: record.id, tipo: 'ACTIVACION', usado_en: null, expira_en: { gt: new Date() } },
      data: { usado_en: new Date() },
    })
    if (consumed.count !== 1) throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
    if (!record.id_cliente) throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')

    await tx.cliente.update({
      where: { id_cliente: record.id_cliente },
      data: { contrasena: passwordHash, contrasena_temporal: false },
    })

    await notificationFactory.crear(
      {
        tipo: 'SISTEMA',
        destino: { id_cliente: record.id_cliente },
        titulo: 'Acceso activado',
        mensaje: 'Tu cuenta fue activada correctamente. Ya puedes iniciar sesión en tu portal.',
        accionUrl: '/cliente',
      },
      tx,
    )
  })

  return { mensaje: 'Contraseña creada exitosamente. Ya puedes iniciar sesión.' }
}

export const setupService = { activarPasswordCliente }
