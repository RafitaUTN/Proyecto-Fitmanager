import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors'

const {
  prisma,
  authRepository,
  bcryptCompare,
  firmarToken,
  firmarRefreshToken,
  verificarRefreshToken,
  transaction,
  tx,
} = vi.hoisted(() => {
  const transactionClient = {
    cliente: { update: vi.fn(), findFirst: vi.fn() },
    usuario: { findFirst: vi.fn() },
    refreshToken: { deleteMany: vi.fn() },
    clienteRefreshToken: { deleteMany: vi.fn() },
  }
  return {
    prisma: {
      $transaction: vi.fn(),
      cliente: { findUnique: vi.fn() },
      gimnasio: { findFirst: vi.fn() },
    },
    authRepository: {
      limpiarExpirados: vi.fn(),
      buscarPorCorreo: vi.fn(),
      guardarRefreshToken: vi.fn(),
      guardarRefreshTokenCliente: vi.fn(),
      buscarRefreshToken: vi.fn(),
      buscarRefreshTokenCliente: vi.fn(),
      eliminarRefreshToken: vi.fn(),
      eliminarRefreshTokenCliente: vi.fn(),
    },
    bcryptCompare: vi.fn(),
    firmarToken: vi.fn(() => 'access-token'),
    firmarRefreshToken: vi.fn(() => 'refresh-token'),
    verificarRefreshToken: vi.fn(),
    transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
      typeof callback === 'function' ? callback(transactionClient) : undefined,
    ),
    tx: transactionClient,
  }
})

vi.mock('../lib/prisma', () => ({ prisma }))
vi.mock('../repositories/auth.repository', () => ({ authRepository }))
vi.mock('../lib/jwt', () => ({ firmarToken, firmarRefreshToken, verificarRefreshToken }))
vi.mock('bcrypt', () => ({ default: { compare: bcryptCompare, hash: vi.fn() } }))

import { authService } from './auth.service'

const usuario = {
  id_usuario: 1n,
  id_gimnasio: 2n,
  rol: 'Administrador',
  nombre: 'Ada',
  apellido: 'L',
  correo: 'a@b.co',
  password_hash: 'hash',
  estado: true,
}

const cliente = {
  id_cliente: 7n,
  id_gimnasio: 3n,
  nombre: 'Juan',
  apellido: 'Perez',
  correo: 'j@b.co',
  contrasena: 'hash',
  estado: true,
  gimnasio: { estado: true, nombre: 'Gym' },
}

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.$transaction = transaction
  })

  describe('crearSesionUsuario', () => {
    it('firma access y refresh y persiste el hash del refresh', async () => {
      authRepository.guardarRefreshToken.mockResolvedValue({ id: 1 })
      const sesion = await authService.crearSesionUsuario(usuario)
      expect(firmarToken).toHaveBeenCalledWith({ id_usuario: 1, id_gimnasio: 2, rol: 'Administrador' })
      expect(firmarRefreshToken).toHaveBeenCalled()
      expect(authRepository.guardarRefreshToken).toHaveBeenCalledWith(1n, expect.any(String), expect.any(Date))
      expect(sesion).toEqual({ token: 'access-token', refreshToken: 'refresh-token' })
    })
  })

  describe('login', () => {
    it('rechaza identidad ambigua (usuario y cliente con el mismo correo)', async () => {
      authRepository.limpiarExpirados.mockResolvedValue(undefined)
      authRepository.buscarPorCorreo.mockResolvedValue(usuario)
      prisma.cliente.findUnique.mockResolvedValue(cliente)
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      await expect(authService.login({ correo: 'a@b.co', password: 'x' } as any)).rejects.toMatchObject({
        codigo: 'IDENTIDAD_AMBIGUA',
        statusCode: 409,
      })
      expect(consoleWarn).toHaveBeenCalled()
      consoleWarn.mockRestore()
    })

    it('rechaza credenciales cuando no existe ningun actor', async () => {
      authRepository.limpiarExpirados.mockResolvedValue(undefined)
      authRepository.buscarPorCorreo.mockResolvedValue(null)
      prisma.cliente.findUnique.mockResolvedValue(null)
      await expect(authService.login({ correo: 'nadie@b.co', password: 'x' } as any)).rejects.toMatchObject({
        statusCode: 401,
        codigo: 'CREDENCIALES_INVALIDAS',
      })
    })

    it('rechaza cliente inactivo o con password incorrecta', async () => {
      authRepository.limpiarExpirados.mockResolvedValue(undefined)
      authRepository.buscarPorCorreo.mockResolvedValue(null)
      prisma.cliente.findUnique.mockResolvedValue(cliente)
      bcryptCompare.mockResolvedValue(false)
      await expect(authService.login({ correo: 'j@b.co', password: 'mala' } as any)).rejects.toMatchObject({
        statusCode: 401,
        codigo: 'CREDENCIALES_INVALIDAS',
      })
    })

    it('inicia sesion de cliente con token y refresh persistido', async () => {
      authRepository.limpiarExpirados.mockResolvedValue(undefined)
      authRepository.buscarPorCorreo.mockResolvedValue(null)
      prisma.cliente.findUnique.mockResolvedValue(cliente)
      bcryptCompare.mockResolvedValue(true)
      authRepository.guardarRefreshTokenCliente.mockResolvedValue({ id: 1 })

      const r = await authService.login({ correo: 'j@b.co', password: 'secreta' } as any)
      expect(r).toMatchObject({
        actorType: 'CLIENTE',
        role: 'Cliente',
        token: 'access-token',
        refreshToken: 'refresh-token',
        cliente: { id_cliente: 7, nombre: 'Juan', apellido: 'Perez', correo: 'j@b.co' },
      })
      expect(tx.cliente.update).toHaveBeenCalledWith({
        where: { id_cliente: 7n },
        data: { ultimo_acceso: expect.any(Date) },
      })
      expect(authRepository.guardarRefreshTokenCliente).toHaveBeenCalledWith(
        7n, expect.any(String), expect.any(Date), tx,
      )
    })

    it('inicia sesion de staff valido y retorna el usuario del gimnasio', async () => {
      authRepository.limpiarExpirados.mockResolvedValue(undefined)
      authRepository.buscarPorCorreo.mockResolvedValue(usuario)
      prisma.cliente.findUnique.mockResolvedValue(null)
      bcryptCompare.mockResolvedValue(true)
      prisma.gimnasio.findFirst.mockResolvedValue({ nombre: 'Gym' })
      authRepository.guardarRefreshToken.mockResolvedValue({ id: 1 })

      const r = await authService.login({ correo: 'a@b.co', password: 'secreta' } as any)
      expect(r).toMatchObject({
        actorType: 'STAFF',
        role: 'Administrador',
        usuario: { id_usuario: 1n, id_gimnasio: 2n, nombre_gimnasio: 'Gym', rol: 'Administrador' },
      })
      expect(authRepository.guardarRefreshToken).toHaveBeenCalled()
    })

    it('rechaza staff con password incorrecta', async () => {
      authRepository.limpiarExpirados.mockResolvedValue(undefined)
      authRepository.buscarPorCorreo.mockResolvedValue(usuario)
      prisma.cliente.findUnique.mockResolvedValue(null)
      bcryptCompare.mockResolvedValue(false)
      await expect(authService.login({ correo: 'a@b.co', password: 'mala' } as any)).rejects.toMatchObject({
        statusCode: 401,
        codigo: 'CREDENCIALES_INVALIDAS',
      })
    })

    it('rechaza staff de gimnasio inactivo', async () => {
      authRepository.limpiarExpirados.mockResolvedValue(undefined)
      authRepository.buscarPorCorreo.mockResolvedValue(usuario)
      prisma.cliente.findUnique.mockResolvedValue(null)
      bcryptCompare.mockResolvedValue(true)
      prisma.gimnasio.findFirst.mockResolvedValue(null)
      await expect(authService.login({ correo: 'a@b.co', password: 'secreta' } as any)).rejects.toMatchObject({
        statusCode: 401,
        codigo: 'CUENTA_INACTIVA',
      })
    })
  })

  describe('refresh', () => {
    it('rechaza un refresh token que no verifica', async () => {
      verificarRefreshToken.mockImplementation(() => { throw new Error('bad') })
      await expect(authService.refresh('invalido')).rejects.toMatchObject({
        statusCode: 401,
        codigo: 'REFRESH_INVALIDO',
      })
    })

    it('rechaza refresh de cliente no persistido o expirado', async () => {
      verificarRefreshToken.mockReturnValue({ id_usuario: 7, id_gimnasio: 3, rol: 'Cliente' })
      authRepository.buscarRefreshTokenCliente.mockResolvedValue(null)
      await expect(authService.refresh('x')).rejects.toMatchObject({ statusCode: 401, codigo: 'REFRESH_INVALIDO' })
      authRepository.buscarRefreshTokenCliente.mockResolvedValue({
        expira_en: new Date(Date.now() - 1000),
        id_cliente: 7n,
      })
      await expect(authService.refresh('x')).rejects.toMatchObject({ statusCode: 401, codigo: 'REFRESH_INVALIDO' })
    })

    it('rota tokens para un cliente valido', async () => {
      verificarRefreshToken.mockReturnValue({ id_usuario: 7, id_gimnasio: 3, rol: 'Cliente' })
      authRepository.buscarRefreshTokenCliente.mockResolvedValue({
        expira_en: new Date(Date.now() + 60000),
        id_cliente: 7n,
      })
      tx.cliente.findFirst.mockResolvedValue({ ...cliente })
      authRepository.eliminarRefreshTokenCliente.mockResolvedValue({ count: 1 })
      authRepository.guardarRefreshTokenCliente.mockResolvedValue({ id: 1 })

      const r = await authService.refresh('x')
      expect(r).toMatchObject({ token: 'access-token', refreshToken: 'refresh-token', actorType: 'CLIENTE' })
      expect(authRepository.eliminarRefreshTokenCliente).toHaveBeenCalledWith(expect.any(String), tx)
      expect(authRepository.guardarRefreshTokenCliente).toHaveBeenCalledWith(7n, expect.any(String), expect.any(Date), tx)
    })

    it('revoca la sesion si el cliente ya no existe', async () => {
      verificarRefreshToken.mockReturnValue({ id_usuario: 7, id_gimnasio: 3, rol: 'Cliente' })
      authRepository.buscarRefreshTokenCliente.mockResolvedValue({
        expira_en: new Date(Date.now() + 60000),
        id_cliente: 7n,
      })
      tx.cliente.findFirst.mockResolvedValue(null)
      await expect(authService.refresh('x')).rejects.toMatchObject({ statusCode: 401, codigo: 'SESION_REVOCADA' })
    })

    it('rota tokens para un staff valido', async () => {
      verificarRefreshToken.mockReturnValue({ id_usuario: 1, id_gimnasio: 2, rol: 'Administrador' })
      authRepository.buscarRefreshToken.mockResolvedValue({
        expira_en: new Date(Date.now() + 60000),
        id_usuario: 1n,
      })
      tx.usuario.findFirst.mockResolvedValue({ ...usuario, gimnasio: { nombre: 'Gym' } })
      authRepository.eliminarRefreshToken.mockResolvedValue({ count: 1 })
      authRepository.guardarRefreshToken.mockResolvedValue({ id: 1 })

      const r = await authService.refresh('x')
      expect(r).toMatchObject({
        token: 'access-token',
        actorType: 'STAFF',
        role: 'Administrador',
        usuario: { id_usuario: 1, id_gimnasio: 2, nombre_gimnasio: 'Gym' },
      })
      expect(authRepository.eliminarRefreshToken).toHaveBeenCalledWith(expect.any(String), tx)
      expect(authRepository.guardarRefreshToken).toHaveBeenCalledWith(1n, expect.any(String), expect.any(Date), tx)
    })

    it('rechaza refresh de staff con id_usuario distinto al del token', async () => {
      verificarRefreshToken.mockReturnValue({ id_usuario: 99, id_gimnasio: 2, rol: 'Administrador' })
      authRepository.buscarRefreshToken.mockResolvedValue({
        expira_en: new Date(Date.now() + 60000),
        id_usuario: 1n,
      })
      await expect(authService.refresh('x')).rejects.toMatchObject({ statusCode: 401, codigo: 'REFRESH_INVALIDO' })
    })

    it('revoca la sesion de staff inexistente', async () => {
      verificarRefreshToken.mockReturnValue({ id_usuario: 1, id_gimnasio: 2, rol: 'Administrador' })
      authRepository.buscarRefreshToken.mockResolvedValue({
        expira_en: new Date(Date.now() + 60000),
        id_usuario: 1n,
      })
      tx.usuario.findFirst.mockResolvedValue(null)
      await expect(authService.refresh('x')).rejects.toMatchObject({ statusCode: 401, codigo: 'SESION_REVOCADA' })
    })
  })

  describe('logout', () => {
    it('no hace nada sin refresh token', async () => {
      await authService.logout(undefined)
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('elimina el refresh en ambas tablas', async () => {
      await authService.logout('token')
      expect(authRepository.eliminarRefreshToken).toHaveBeenCalledWith(expect.any(String), tx)
      expect(authRepository.eliminarRefreshTokenCliente).toHaveBeenCalledWith(expect.any(String), tx)
    })
  })
})
