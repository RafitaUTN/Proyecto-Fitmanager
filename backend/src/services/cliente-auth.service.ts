import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { authRepository } from '../repositories/auth.repository'
import { AppError } from '../lib/errors'
import { notificationFactory } from './notification-factory.service'
import { recordSecurityAudit } from '../lib/security-audit'

export const clienteAuthService = {
  async cambiarPassword(idCliente: bigint, passwordActual: string, passwordNueva: string) {
    const cliente = await prisma.cliente.findUnique({ where: { id_cliente: idCliente } })
    if (!cliente?.contrasena) throw new AppError('Cliente no encontrado o acceso no habilitado', 404, 'NO_ENCONTRADO')
    if (!await bcrypt.compare(passwordActual, cliente.contrasena)) {
      throw new AppError('La contraseña actual no es correcta', 400, 'INVALID_CURRENT_PASSWORD')
    }
    if (await bcrypt.compare(passwordNueva, cliente.contrasena)) {
      throw new AppError('La nueva contraseña debe ser diferente de la actual', 400, 'PASSWORD_UNCHANGED')
    }
    const hash = await bcrypt.hash(passwordNueva, 12)
    await prisma.$transaction(async (tx) => {
      await tx.cliente.update({ where: { id_cliente: idCliente }, data: { contrasena: hash, contrasena_temporal: false } })
      await authRepository.limpiarRefreshTokensCliente(idCliente, tx)
      await notificationFactory.crear({
        tipo: 'SISTEMA',
        destino: { id_cliente: idCliente },
        titulo: 'Contraseña modificada',
        mensaje: 'Tu contraseña fue modificada correctamente. Por seguridad, cerramos tus otras sesiones.',
        accionUrl: '/cliente/perfil',
      }, tx)
    })
    recordSecurityAudit('PASSWORD_CHANGED', { actorType: 'CLIENTE', actorId: idCliente, gymId: cliente.id_gimnasio })
  },
}
