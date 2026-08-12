import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => {
  const rutina = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  const rutinaEjercicio = { createMany: vi.fn(), deleteMany: vi.fn() }
  const rutinaEntrenador = { create: vi.fn(), delete: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() }
  const clienteRutina = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() }
  const clienteRutinaEjercicio = { findFirst: vi.fn(), update: vi.fn(), createMany: vi.fn() }
  return { rutina, rutinaEjercicio, rutinaEntrenador, clienteRutina, clienteRutinaEjercicio }
})

vi.mock('../lib/prisma', () => ({ prisma: db }))

import { rutinaRepository } from './rutina.repository'

describe('rutinaRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listarPorGimnasio filtra por gimnasio y opcionalmente por entrenador', async () => {
    db.rutina.findMany.mockResolvedValue([])
    await rutinaRepository.listarPorGimnasio(2n)
    await rutinaRepository.listarPorGimnasio(2n, 15n)
    const calls = db.rutina.findMany.mock.calls
    expect(calls[0][0].where).toEqual({ id_gimnasio: 2n })
    expect(calls[1][0].where).toEqual({ id_gimnasio: 2n, entrenadores: { some: { id_entrenador: 15n, estado: true } } })
  })

  it('busca rutina por id, gimnasio y entrenador asignado', async () => {
    db.rutina.findFirst.mockResolvedValue(null)
    await rutinaRepository.buscarPorId(8n, 2n, 15n)
    expect(db.rutina.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id_rutina: 8n,
        id_gimnasio: 2n,
        entrenadores: { some: { id_entrenador: 15n, estado: true } },
      },
    }))
  })

  it('busca rutina básica con filtro opcional de entrenador', async () => {
    db.rutina.findFirst.mockResolvedValue({ id_rutina: 8n })
    const r = await rutinaRepository.buscarBasicaPorId(8n, 2n)
    expect(r).toEqual({ id_rutina: 8n })
    expect(db.rutina.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id_rutina: 8n, id_gimnasio: 2n },
    }))
  })

  it('crea una rutina', async () => {
    db.rutina.create.mockResolvedValue({ id_rutina: 5n })
    const r = await rutinaRepository.crear({ id_gimnasio: 2n, id_usuario_creador: 1n, nombre: 'A' })
    expect(r).toEqual({ id_rutina: 5n })
    expect(db.rutina.create).toHaveBeenCalledWith({ data: { id_gimnasio: 2n, id_usuario_creador: 1n, nombre: 'A' } })
  })

  it('actualiza una rutina', async () => {
    db.rutina.update.mockResolvedValue({ id_rutina: 5n })
    await rutinaRepository.actualizar(5n, { nombre: 'B' })
    expect(db.rutina.update).toHaveBeenCalledWith({ where: { id_rutina: 5n }, data: { nombre: 'B' } })
  })

  it('elimina una rutina', async () => {
    db.rutina.delete.mockResolvedValue({ id_rutina: 5n })
    await rutinaRepository.eliminar(5n)
    expect(db.rutina.delete).toHaveBeenCalledWith({ where: { id_rutina: 5n } })
  })

  it('agrega ejercicios con defaults null y orden', async () => {
    db.rutinaEjercicio.createMany.mockResolvedValue({ count: 1 })
    await rutinaRepository.agregarEjercicios(5n, [
      { id_ejercicio: 1n, series: 3, repeticiones: 10 },
      { id_ejercicio: 2n, series: 4, repeticiones: 8, peso_sugerido: 20, descanso: 60, notas: 'x', orden: 2 },
    ])
    const data = db.rutinaEjercicio.createMany.mock.calls[0][0].data
    expect(data[0]).toEqual({ id_rutina: 5n, id_ejercicio: 1n, series: 3, repeticiones: 10, peso_sugerido: null, descanso: null, notas: null, orden: 0 })
    expect(data[1].peso_sugerido).toBe(20)
  })

  it('elimina los ejercicios de una rutina', async () => {
    db.rutinaEjercicio.deleteMany.mockResolvedValue({ count: 2 })
    await rutinaRepository.eliminarEjercicios(5n)
    expect(db.rutinaEjercicio.deleteMany).toHaveBeenCalledWith({ where: { id_rutina: 5n } })
  })

  it('asigna y remueve un entrenador', async () => {
    db.rutinaEntrenador.create.mockResolvedValue({ id_rutina: 5n, id_entrenador: 9n })
    db.rutinaEntrenador.delete.mockResolvedValue({ id_rutina: 5n, id_entrenador: 9n })
    await rutinaRepository.asignarEntrenador(5n, 9n)
    await rutinaRepository.removerEntrenador(5n, 9n)
    expect(db.rutinaEntrenador.create).toHaveBeenCalledWith({ data: { id_rutina: 5n, id_entrenador: 9n } })
    expect(db.rutinaEntrenador.delete).toHaveBeenCalledWith({
      where: { id_rutina_id_entrenador: { id_rutina: 5n, id_entrenador: 9n } },
    })
  })

  it('lista entrenadores asignados scoped por gimnasio', async () => {
    db.rutinaEntrenador.findMany.mockResolvedValue([{ id_entrenador: 9n }])
    const r = await rutinaRepository.listarEntrenadoresAsignados(5n, 2n)
    expect(r).toEqual([{ id_entrenador: 9n }])
    expect(db.rutinaEntrenador.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id_rutina: 5n, rutina: { id_gimnasio: 2n } },
    }))
  })

  it('busca asignación activa por cliente, rutina y gimnasio', async () => {
    db.clienteRutina.findFirst.mockResolvedValue(null)
    await rutinaRepository.buscarAsignacionActiva(88n, 5n, 2n)
    expect(db.clienteRutina.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id_cliente: 88n,
        id_rutina: 5n,
        estado: 'activa',
        cliente: { id_gimnasio: 2n },
        rutina: { id_gimnasio: 2n },
      }),
    }))
  })

  it('lista asignaciones con filtro de entrenador', async () => {
    db.clienteRutina.findMany.mockResolvedValue([])
    await rutinaRepository.listarAsignaciones(5n, 2n, 15n)
    expect(db.clienteRutina.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id_rutina: 5n,
        cliente: { id_gimnasio: 2n, id_entrenador: 15n },
      }),
    }))
  })

  it('protege snapshot por ambos tenants y cliente asignado al entrenador', async () => {
    db.clienteRutina.findFirst.mockResolvedValue(null)
    await rutinaRepository.buscarClienteRutina(30n, 2n, 15n)
    expect(db.clienteRutina.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id_cliente_rutina: 30n,
        cliente: { id_gimnasio: 2n, id_entrenador: 15n },
        rutina: { id_gimnasio: 2n },
      }),
    }))
  })

  it('protege el ejercicio materializado a través de su asignación', async () => {
    db.clienteRutinaEjercicio.findFirst.mockResolvedValue(null)
    await rutinaRepository.buscarEjercicioCliente(44n, 2n, 15n)
    expect(db.clienteRutinaEjercicio.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        cliente_rutina: {
          cliente: { id_gimnasio: 2n, id_entrenador: 15n },
          rutina: { id_gimnasio: 2n },
        },
      }),
    }))
  })

  it('actualiza un ejercicio materializado', async () => {
    db.clienteRutinaEjercicio.update.mockResolvedValue({ id_cliente_rutina_ejercicio: 1n })
    await rutinaRepository.actualizarEjercicioCliente(1n, { series: 5 })
    expect(db.clienteRutinaEjercicio.update).toHaveBeenCalledWith({
      where: { id_cliente_rutina_ejercicio: 1n },
      data: { series: 5 },
    })
  })

  it('actualiza una asignación de cliente', async () => {
    db.clienteRutina.update.mockResolvedValue({ id_cliente_rutina: 10n })
    await rutinaRepository.actualizarClienteRutina(10n, { estado: 'completada' })
    expect(db.clienteRutina.update).toHaveBeenCalledWith({
      where: { id_cliente_rutina: 10n },
      data: { estado: 'completada' },
    })
  })

  it('lista rutinas de un cliente con filtro de entrenador', async () => {
    db.clienteRutina.findMany.mockResolvedValue([{ id_cliente_rutina: 10n }])
    const r = await rutinaRepository.listarRutinasDeCliente(88n, 2n, 15n)
    expect(r).toEqual([{ id_cliente_rutina: 10n }])
    expect(db.clienteRutina.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id_cliente: 88n,
        cliente: { id_gimnasio: 2n, id_entrenador: 15n },
      }),
    }))
  })
})
