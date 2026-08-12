import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors'

const {
  prisma,
  authRepository,
  notificationFactory,
  bcryptCompare,
  bcryptHash,
  recordSecurityAudit,
  transaction,
  tx,
} = vi.hoisted(() => {
  const transactionClient = {
    cliente: { update: vi.fn() },
  }
  return {
    prisma: {
      $transaction: vi.fn(),
      cliente: { findUnique: vi.fn() },
    },
    authRepository: { limpiarRefreshTokensCliente: vi.fn() },
    notificationFactory: { crear: vi.fn() },
    bcryptCompare: vi.fn(),
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
vi.mock('../lib/security-audit', () => ({ recordSecurityAudit }))
vi.mock('bcrypt', () => ({ default: { compare: bcryptCompare, hash: bcryptHash } }))

import { clienteAuthService } from './cliente-auth.service'

const cliente = {
  id_cliente: 7n,
  id_gimnasio: 3n,
  nombre: 'Juan',
  apellido: 'Perez',
  correo: 'j@b.co',
  contrasena: 'hash',
}

describe('clienteAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.$transaction = transaction
  })

  describe('cambiarPassword', () => {
    it('rechaza cliente sin acceso habilitado', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null)
      await expect(clienteAuthService.cambiarPassword(7n, 'a', 'b')).rejects.toMatchObject({
        statusCode: 404,
        codigo: 'NO_ENCONTRADO',
      })
      prisma.cliente.findUnique.mockResolvedValue({ ...cliente, contrasena: null })
      await expect(clienteAuthService.cambiarPassword(7n, 'a', 'b')).rejects.toMatchObject({
        statusCode: 404,
        codigo: 'NO_ENCONTRADO',
      })
    })

    it('rechaza password actual incorrecta', async () => {
      prisma.cliente.findUnique.mockResolvedValue(cliente)
      bcryptCompare.mockResolvedValue(false)
      await expect(clienteAuthService.cambiarPassword(7n, 'mala', 'nueva')).rejects.toMatchObject({
        statusCode: 400,
        codigo: 'INVALID_CURRENT_PASSWORD',
      })
    })

    it('rechaza una password igual a la actual', async () => {
      prisma.cliente.findUnique.mockResolvedValue(cliente)
      bcryptCompare.mockResolvedValue(true)
      await expect(clienteAuthService.cambiarPassword(7n, 'misma', 'misma')).rejects.toMatchObject({
        statusCode: 400,
        codigo: 'PASSWORD_UNCHANGED',
      })
    })

    it('actualiza hash, limpia refresh tokens y notifica', async () => {
      prisma.cliente.findUnique.mockResolvedValue(cliente)
      bcryptCompare.mockImplementation(async (a: string, b: string) => a === 'actual' && b === 'hash')
      bcryptHash.mockResolvedValue('nuevo-hash')
      authRepository.limpiarRefreshTokensCliente.mockResolvedValue({ count: 2 })
      notificationFactory.crear.mockResolvedValue({ id_notificacion: 1n })

      await clienteAuthService.cambiarPassword(7n, 'actual', 'nueva123')

      expect(tx.cliente.update).toHaveBeenCalledWith({
        where: { id_cliente: 7n },
        data: { contrasena: 'nuevo-hash', contrasena_temporal: false },
      })
      expect(authRepository.limpiarRefreshTokensCliente).toHaveBeenCalledWith(7n, tx)
      expect(notificationFactory.crear).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'SISTEMA' }), tx)
      expect(recordSecurityAudit).toHaveBeenCalledWith('PASSWORD_CHANGED', {
        actorType: 'CLIENTE',
        actorId: 7n,
        gymId: 3n,
      })
    })
  })
})
