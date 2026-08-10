import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors'

const { prisma } = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    token: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}))

vi.mock('../lib/prisma', () => ({ prisma }))

import { tokenService } from './token.service'

function txMock() {
  return {
    token: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  }
}

describe('tokenService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('crearActivacionRegistro', () => {
    it('persiste un token de activacion con hash e invalida enlaces previos', async () => {
      const db = txMock()
      db.token.deleteMany.mockResolvedValue({ count: 1 })
      db.token.create.mockResolvedValue({ id: 42n })

      const token = await tokenService.crearActivacionRegistro(7n, 3n, db as any)

      expect(db.token.deleteMany).toHaveBeenCalledWith({
        where: { id_cliente: 7n, tipo: 'ACTIVACION', usado_en: null },
      })
      expect(db.token.create).toHaveBeenCalledTimes(1)
      const data = db.token.create.mock.calls[0][0].data
      expect(data.tipo).toBe('ACTIVACION')
      expect(data.token_hash).toMatch(/^[a-f0-9]{64}$/)
      expect(data.token_hash).not.toBe(token.value)
      expect(data.creado_por).toBe(3n)
      expect(token).toEqual({ id: 42n, value: expect.any(String) })
      expect(token.value).toHaveLength(64)
    })

    it('usa una transaccion real cuando no se inyecta db', async () => {
      const db = txMock()
      prisma.$transaction.mockImplementation(async (fn: any) => fn(db))
      db.token.deleteMany.mockResolvedValue({ count: 0 })
      db.token.create.mockResolvedValue({ id: 1n })

      await tokenService.crearActivacionRegistro(5n)

      expect(prisma.$transaction).toHaveBeenCalled()
      expect(db.token.create).toHaveBeenCalledTimes(1)
    })
  })

  it('crearActivacion devuelve solo el valor en claro', async () => {
    const db = txMock()
    db.token.create.mockResolvedValue({ id: 1n })
    prisma.$transaction.mockImplementation(async (fn: any) => fn(db))
    const value = await tokenService.crearActivacion(9n)
    expect(value).toHaveLength(64)
  })

  describe('crearRecuperacionRegistro', () => {
    it('usa el actor CLIENTE', async () => {
      const db = txMock()
      db.token.deleteMany.mockResolvedValue({ count: 0 })
      db.token.create.mockResolvedValue({ id: 2n })
      const token = await tokenService.crearRecuperacionRegistro({ actorType: 'CLIENTE', actorId: 11n }, db as any)
      expect(db.token.deleteMany).toHaveBeenCalledWith({
        where: { id_cliente: 11n, tipo: 'RECUPERACION', usado_en: null },
      })
      expect(token).toEqual({ id: 2n, value: expect.any(String) })
    })

    it('usa el actor STAFF', async () => {
      const db = txMock()
      db.token.deleteMany.mockResolvedValue({ count: 0 })
      db.token.create.mockResolvedValue({ id: 3n })
      await tokenService.crearRecuperacionRegistro({ actorType: 'STAFF', actorId: 8n }, db as any)
      expect(db.token.deleteMany).toHaveBeenCalledWith({
        where: { id_usuario: 8n, tipo: 'RECUPERACION', usado_en: null },
      })
    })
  })

  describe('validarToken', () => {
    it('rechaza un token inexistente', async () => {
      prisma.token.findUnique.mockResolvedValue(null)
      await expect(tokenService.validarToken('abc', 'ACTIVACION')).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO' })
    })

    it('rechaza un token de otro tipo', async () => {
      prisma.token.findUnique.mockResolvedValue({ tipo: 'RECUPERACION', usado_en: null, expira_en: new Date('2099-01-01') })
      await expect(tokenService.validarToken('abc', 'ACTIVACION')).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO' })
    })

    it('rechaza un token ya usado', async () => {
      prisma.token.findUnique.mockResolvedValue({ tipo: 'ACTIVACION', usado_en: new Date(), expira_en: new Date('2099-01-01') })
      await expect(tokenService.validarToken('abc', 'ACTIVACION')).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO' })
    })

    it('rechaza un token expirado', async () => {
      prisma.token.findUnique.mockResolvedValue({ tipo: 'ACTIVACION', usado_en: null, expira_en: new Date('2020-01-01') })
      await expect(tokenService.validarToken('abc', 'ACTIVACION')).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO' })
    })

    it('devuelve el actor de un token valido de cliente', async () => {
      prisma.token.findUnique.mockResolvedValue({ tipo: 'ACTIVACION', usado_en: null, expira_en: new Date('2099-01-01'), id_cliente: 7n, id_usuario: null })
      const result = await tokenService.validarToken('abc', 'ACTIVACION')
      expect(result).toEqual({ id_cliente: 7n, id_usuario: null })
    })

    it('devuelve el actor de un token valido de staff', async () => {
      prisma.token.findUnique.mockResolvedValue({ tipo: 'RECUPERACION', usado_en: null, expira_en: new Date('2099-01-01'), id_cliente: null, id_usuario: 3n })
      const result = await tokenService.validarToken('abc', 'RECUPERACION')
      expect(result).toEqual({ id_cliente: null, id_usuario: 3n })
    })
  })

  describe('usarToken', () => {
    it('consuma el token de forma atomica marcando usado_en', async () => {
      prisma.token.updateMany.mockResolvedValue({ count: 1 })
      prisma.token.findUnique.mockResolvedValue({ tipo: 'ACTIVACION', usado_en: new Date(), expira_en: new Date('2099-01-01'), id_cliente: 7n, id_usuario: null })
      const result = await tokenService.usarToken('abc', 'ACTIVACION')
      expect(prisma.token.updateMany).toHaveBeenCalledWith({
        where: { token_hash: expect.any(String), tipo: 'ACTIVACION', usado_en: null, expira_en: { gt: expect.any(Date) } },
        data: { usado_en: expect.any(Date) },
      })
      expect(result).toEqual({ id_cliente: 7n, id_usuario: null })
    })

    it('rechaza sin consumir cuando el token no puede marcarse (invalido, usado o expirado)', async () => {
      prisma.token.updateMany.mockResolvedValue({ count: 0 })
      await expect(tokenService.usarToken('abc', 'ACTIVACION')).rejects.toBeInstanceOf(AppError)
      expect(prisma.token.findUnique).not.toHaveBeenCalled()
    })
  })
})
