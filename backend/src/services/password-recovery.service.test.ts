import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors'

const {
  prisma,
  authRepository,
  notificationFactory,
  emailService,
  bcryptHash,
  recordSecurityAudit,
  transaction,
  tx,
} = vi.hoisted(() => {
  const transactionClient = {
    token: { findUnique: vi.fn(), updateMany: vi.fn() },
    cliente: { update: vi.fn() },
    usuario: { update: vi.fn() },
  }
  return {
    prisma: {
      $transaction: vi.fn(),
      cliente: { findFirst: vi.fn() },
      usuario: { findFirst: vi.fn() },
    },
    authRepository: {
      limpiarRefreshTokensCliente: vi.fn(),
      limpiarRefreshTokensUsuario: vi.fn(),
    },
    notificationFactory: { crear: vi.fn() },
    emailService: { sendPasswordResetEmail: vi.fn() },
    bcryptHash: vi.fn(),
    recordSecurityAudit: vi.fn(),
    transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
      typeof callback === 'function' ? callback(transactionClient) : undefined,
    ),
    tx: transactionClient,
  }
})

vi.mock('../lib/prisma', () => ({ prisma }))
vi.mock('../repositories/auth.repository', () => ({ authRepository }))
vi.mock('./notification-factory.service', () => ({ notificationFactory }))
vi.mock('../email/email.service', () => ({ emailService }))
vi.mock('../lib/security-audit', () => ({ recordSecurityAudit }))
vi.mock('bcrypt', () => ({ default: { hash: bcryptHash, compare: vi.fn() } }))
vi.mock('../lib/token-hash', () => ({ hashToken: (t: string) => `hash-${t}` }))

import { passwordRecoveryService } from './password-recovery.service'

const cliente = { id_cliente: 7n, nombre: 'Juan', correo: 'j@b.co' }
const usuario = { id_usuario: 1n, nombre: 'Ada', correo: 'a@b.co' }

describe('passwordRecoveryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.$transaction = transaction
  })

  describe('solicitar', () => {
    it('responde generico sin enviar correo cuando no existe cuenta', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null)
      prisma.usuario.findFirst.mockResolvedValue(null)
      const r = await passwordRecoveryService.solicitar('nadie@b.co')
      expect(r.mensaje).toContain('Si existe una cuenta activa')
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('responde generico ante identidad ambigua', async () => {
      prisma.cliente.findFirst.mockResolvedValue(cliente)
      prisma.usuario.findFirst.mockResolvedValue(usuario)
      const r = await passwordRecoveryService.solicitar('j@b.co')
      expect(r.mensaje).toContain('Si existe una cuenta activa')
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('envia correo para un cliente', async () => {
      prisma.cliente.findFirst.mockResolvedValue(cliente)
      prisma.usuario.findFirst.mockResolvedValue(null)
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined)
      const r = await passwordRecoveryService.solicitar('j@b.co')
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        { id_cliente: 7n, nombre: 'Juan', correo: 'j@b.co' },
        { actorType: 'CLIENTE', actorId: 7n },
      )
      expect(r.mensaje).toContain('Si existe una cuenta activa')
    })

    it('envia correo para staff', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null)
      prisma.usuario.findFirst.mockResolvedValue(usuario)
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined)
      await passwordRecoveryService.solicitar('a@b.co')
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        { id_usuario: 1n, nombre: 'Ada', correo: 'a@b.co' },
        { actorType: 'STAFF', actorId: 1n },
      )
    })

    it('no rompe la respuesta generica si el envio falla', async () => {
      prisma.cliente.findFirst.mockResolvedValue(cliente)
      prisma.usuario.findFirst.mockResolvedValue(null)
      emailService.sendPasswordResetEmail.mockRejectedValue(new Error('smtp down'))
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const r = await passwordRecoveryService.solicitar('j@b.co')
      expect(r.mensaje).toContain('Si existe una cuenta activa')
      consoleError.mockRestore()
    })
  })

  describe('restablecer', () => {
    const recordCliente = {
      id: 10n,
      token_hash: 'hash-x',
      tipo: 'RECUPERACION',
      usado_en: null,
      expira_en: new Date(Date.now() + 60000),
      id_cliente: 7n,
      id_usuario: null,
    }

    it('rechaza token invalido o expirado', async () => {
      tx.token.findUnique.mockResolvedValue(null)
      await expect(passwordRecoveryService.restablecer('x', 'nueva')).rejects.toMatchObject({
        statusCode: 400,
        codigo: 'TOKEN_INVALIDO',
      })
      tx.token.findUnique.mockResolvedValue({ ...recordCliente, tipo: 'ACTIVACION' })
      await expect(passwordRecoveryService.restablecer('x', 'nueva')).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO' })
    })

    it('rechaza un token ya consumido', async () => {
      tx.token.findUnique.mockResolvedValue(recordCliente)
      tx.token.updateMany.mockResolvedValue({ count: 0 })
      await expect(passwordRecoveryService.restablecer('x', 'nueva')).rejects.toMatchObject({
        statusCode: 400,
        codigo: 'TOKEN_INVALIDO',
      })
    })

    it('restablece password de cliente y limpia sesiones', async () => {
      bcryptHash.mockResolvedValue('nuevo-hash')
      tx.token.findUnique.mockResolvedValue(recordCliente)
      tx.token.updateMany.mockResolvedValue({ count: 1 })
      tx.cliente.update.mockResolvedValue({ id_cliente: 7n, id_gimnasio: 3n })
      authRepository.limpiarRefreshTokensCliente.mockResolvedValue({ count: 1 })
      notificationFactory.crear.mockResolvedValue({ id_notificacion: 1n })

      const r = await passwordRecoveryService.restablecer('x', 'nueva123')
      expect(bcryptHash).toHaveBeenCalledWith('nueva123', 12)
      expect(tx.cliente.update).toHaveBeenCalledWith({
        where: { id_cliente: 7n },
        data: { contrasena: 'nuevo-hash', contrasena_temporal: false },
        select: { id_cliente: true, id_gimnasio: true },
      })
      expect(authRepository.limpiarRefreshTokensCliente).toHaveBeenCalledWith(7n, tx)
      expect(notificationFactory.crear).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'SISTEMA' }), tx)
      expect(recordSecurityAudit).toHaveBeenCalledWith('PASSWORD_RESET', {
        actorType: 'CLIENTE',
        actorId: 7n,
        gymId: 3n,
      })
      expect(r.mensaje).toContain('Contrase')
    })

    it('restablece password de staff y limpia sesiones', async () => {
      bcryptHash.mockResolvedValue('nuevo-hash')
      tx.token.findUnique.mockResolvedValue({
        ...recordCliente,
        id_cliente: null,
        id_usuario: 1n,
      })
      tx.token.updateMany.mockResolvedValue({ count: 1 })
      tx.usuario.update.mockResolvedValue({ id_usuario: 1n, id_gimnasio: 2n })
      authRepository.limpiarRefreshTokensUsuario.mockResolvedValue({ count: 1 })
      notificationFactory.crear.mockResolvedValue({ id_notificacion: 1n })

      await passwordRecoveryService.restablecer('x', 'nueva123')
      expect(tx.usuario.update).toHaveBeenCalledWith({
        where: { id_usuario: 1n },
        data: { password_hash: 'nuevo-hash' },
        select: { id_usuario: true, id_gimnasio: true },
      })
      expect(authRepository.limpiarRefreshTokensUsuario).toHaveBeenCalledWith(1n, tx)
      expect(recordSecurityAudit).toHaveBeenCalledWith('PASSWORD_RESET', {
        actorType: 'STAFF',
        actorId: 1n,
        gymId: 2n,
      })
    })

    it('rechaza un registro sin actor', async () => {
      tx.token.findUnique.mockResolvedValue({ ...recordCliente, id_cliente: null, id_usuario: null })
      tx.token.updateMany.mockResolvedValue({ count: 1 })
      await expect(passwordRecoveryService.restablecer('x', 'nueva')).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO' })
    })
  })
})
