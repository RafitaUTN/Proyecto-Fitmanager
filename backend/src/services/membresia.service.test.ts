import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prisma, membresiaRepository } = vi.hoisted(() => ({
  prisma: { clienteMembresia: { count: vi.fn() } },
  membresiaRepository: {
    listarPorGimnasio: vi.fn(),
    buscarPorId: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  },
}))

vi.mock('../lib/prisma', () => ({ prisma }))
vi.mock('../repositories/membresia.repository', () => ({ membresiaRepository }))

import { membresiaService } from './membresia.service'

const membresia = { id_membresia: 2n, id_gimnasio: 3n, nombre: 'Premium', precio: 35000, duracion_dias: 30 }

describe('membresiaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listar', () => {
    it('lista planes del gimnasio', async () => {
      membresiaRepository.listarPorGimnasio.mockResolvedValue([membresia])
      await expect(membresiaService.listar(3n)).resolves.toEqual([membresia])
      expect(membresiaRepository.listarPorGimnasio).toHaveBeenCalledWith(3n)
    })
  })

  describe('buscar', () => {
    it('retorna la membresía del mismo gimnasio', async () => {
      membresiaRepository.buscarPorId.mockResolvedValue(membresia)
      await expect(membresiaService.buscar(2n, 3n)).resolves.toEqual(membresia)
    })

    it('lanza 404 si la membresía pertenece a otro gimnasio', async () => {
      membresiaRepository.buscarPorId.mockResolvedValue(membresia)
      await expect(membresiaService.buscar(2n, 99n)).rejects.toMatchObject({ statusCode: 404 })
    })

    it('lanza 404 si no existe', async () => {
      membresiaRepository.buscarPorId.mockResolvedValue(null)
      await expect(membresiaService.buscar(99n, 3n)).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('crear', () => {
    it('crea el plan con el gimnasio del contexto', async () => {
      membresiaRepository.crear.mockResolvedValue(membresia)
      await membresiaService.crear(3n, { nombre: 'Premium', precio: 35000, duracion_dias: 30 })
      expect(membresiaRepository.crear).toHaveBeenCalledWith({ nombre: 'Premium', precio: 35000, duracion_dias: 30, id_gimnasio: 3n })
    })
  })

  describe('actualizar', () => {
    it('actualiza un plan existente del gimnasio', async () => {
      membresiaRepository.buscarPorId.mockResolvedValue(membresia)
      membresiaRepository.actualizar.mockResolvedValue({ ...membresia, precio: 40000 })
      const r = await membresiaService.actualizar(2n, { precio: 40000 }, 3n)
      expect(membresiaRepository.actualizar).toHaveBeenCalledWith(2n, { precio: 40000 })
      expect(r.precio).toBe(40000)
    })
  })

  describe('eliminar', () => {
    it('elimina un plan sin asignaciones', async () => {
      membresiaRepository.buscarPorId.mockResolvedValue(membresia)
      prisma.clienteMembresia.count.mockResolvedValue(0)
      await membresiaService.eliminar(2n, 3n)
      expect(membresiaRepository.eliminar).toHaveBeenCalledWith(2n)
    })

    it('lanza 409 si el plan tiene membresías asignadas', async () => {
      membresiaRepository.buscarPorId.mockResolvedValue(membresia)
      prisma.clienteMembresia.count.mockResolvedValue(3)
      await expect(membresiaService.eliminar(2n, 3n)).rejects.toMatchObject({ statusCode: 409 })
      expect(membresiaRepository.eliminar).not.toHaveBeenCalled()
    })

    it('lanza 404 si el plan no existe', async () => {
      membresiaRepository.buscarPorId.mockResolvedValue(null)
      await expect(membresiaService.eliminar(99n, 3n)).rejects.toMatchObject({ statusCode: 404 })
    })
  })
})
