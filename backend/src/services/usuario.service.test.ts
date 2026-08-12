import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prisma, usuarioRepository } = vi.hoisted(() => ({
  prisma: {
    cliente: { findUnique: vi.fn(), count: vi.fn() },
    usuario: { count: vi.fn() },
    rutina: { count: vi.fn() },
    clienteRutina: { count: vi.fn() },
    solicitudTransferencia: { count: vi.fn() },
  },
  usuarioRepository: {
    listarPorGimnasio: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorCorreo: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  },
}))

vi.mock('../lib/prisma', () => ({ prisma }))
vi.mock('../repositories/usuario.repository', () => ({ usuarioRepository }))
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hash-simulado'),
    compare: vi.fn(),
  },
}))

import { usuarioService } from './usuario.service'

const usuario = { id_usuario: 5n, id_gimnasio: 3n, nombre: 'Ana', apellido: 'López', correo: 'ana@fit.com', rol: 'Entrenador', estado: true }

describe('usuarioService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('crear', () => {
    it('lanza 409 si el correo ya es identidad de acceso', async () => {
      usuarioRepository.buscarPorCorreo.mockResolvedValue(usuario)
      await expect(
        usuarioService.crear(3n, { correo: 'ana@fit.com', password: '123456', nombre: 'Ana', apellido: 'López', rol: 'Entrenador' }),
      ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('crea el usuario con password hasheado', async () => {
      usuarioRepository.buscarPorCorreo.mockResolvedValue(null)
      prisma.cliente.findUnique.mockResolvedValue(null)
      usuarioRepository.crear.mockResolvedValue(usuario)
      await usuarioService.crear(3n, { correo: 'ana@fit.com', password: '123456', nombre: 'Ana', apellido: 'López', rol: 'Entrenador' })
      expect(usuarioRepository.crear).toHaveBeenCalledWith({
        correo: 'ana@fit.com',
        nombre: 'Ana',
        apellido: 'López',
        rol: 'Entrenador',
        id_gimnasio: 3n,
        password_hash: 'hash-simulado',
      })
    })
  })

  describe('eliminar', () => {
    beforeEach(() => {
      usuarioRepository.buscarPorId.mockResolvedValue(usuario)
      prisma.usuario.count.mockResolvedValue(1)
      prisma.cliente.count.mockResolvedValue(0)
      prisma.rutina.count.mockResolvedValue(0)
      prisma.clienteRutina.count.mockResolvedValue(0)
      prisma.solicitudTransferencia.count.mockResolvedValue(0)
    })

    it('elimina un usuario sin registros asociados', async () => {
      await usuarioService.eliminar(5n, 3n)
      expect(usuarioRepository.eliminar).toHaveBeenCalledWith(5n)
    })

    it('lanza 400 si intenta eliminarse a sí mismo', async () => {
      await expect(usuarioService.eliminar(5n, 3n, 5n)).rejects.toMatchObject({ statusCode: 400 })
      expect(usuarioRepository.eliminar).not.toHaveBeenCalled()
    })

    it('lanza 400 si es el último administrador activo', async () => {
      const admin = { ...usuario, rol: 'Administrador' }
      usuarioRepository.buscarPorId.mockResolvedValue(admin)
      prisma.usuario.count.mockResolvedValue(1)
      await expect(usuarioService.eliminar(5n, 3n)).rejects.toMatchObject({ statusCode: 400 })
      expect(usuarioRepository.eliminar).not.toHaveBeenCalled()
    })

    it('lanza 409 si tiene clientes asignados', async () => {
      prisma.cliente.count.mockResolvedValue(2)
      await expect(usuarioService.eliminar(5n, 3n)).rejects.toMatchObject({ statusCode: 409 })
      expect(usuarioRepository.eliminar).not.toHaveBeenCalled()
    })

    it('lanza 409 si tiene rutinas creadas', async () => {
      prisma.rutina.count.mockResolvedValue(1)
      await expect(usuarioService.eliminar(5n, 3n)).rejects.toMatchObject({ statusCode: 409 })
      expect(usuarioRepository.eliminar).not.toHaveBeenCalled()
    })

    it('lanza 409 si tiene solicitudes de transferencia', async () => {
      prisma.solicitudTransferencia.count.mockResolvedValue(1)
      await expect(usuarioService.eliminar(5n, 3n)).rejects.toMatchObject({ statusCode: 409 })
      expect(usuarioRepository.eliminar).not.toHaveBeenCalled()
    })
  })
})
