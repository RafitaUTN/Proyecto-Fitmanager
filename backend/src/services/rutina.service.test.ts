import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  tx,
  transaction,
  prismaMock,
  listarPorGimnasio,
  buscarPorId,
  buscarBasicaPorId,
  crear,
  actualizar,
  eliminar,
  agregarEjercicios,
  eliminarEjercicios,
  asignarEntrenador,
  removerEntrenador,
  listarEntrenadoresAsignados,
  buscarAsignacionActiva,
  listarAsignaciones,
  buscarClienteRutina,
  buscarEjercicioCliente,
  actualizarEjercicioCliente,
  actualizarClienteRutina,
  listarRutinasDeCliente,
  crearNotificacion,
} = vi.hoisted(() => {
  const transactionClient = {
    cliente: { findFirst: vi.fn() },
    clienteRutina: { create: vi.fn(), deleteMany: vi.fn() },
    clienteRutinaEjercicio: { createMany: vi.fn() },
    rutinaEjercicio: { findMany: vi.fn() },
    ejercicio: { count: vi.fn() },
    usuario: { findFirst: vi.fn() },
    rutinaEntrenador: { findUnique: vi.fn() },
  }
  const prismaMock = { $transaction: undefined as unknown, cliente: { findFirst: vi.fn() } }
  return {
    tx: transactionClient,
    transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) => callback(transactionClient)),
    prismaMock,
    listarPorGimnasio: vi.fn(),
    buscarPorId: vi.fn(),
    buscarBasicaPorId: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    agregarEjercicios: vi.fn(),
    eliminarEjercicios: vi.fn(),
    asignarEntrenador: vi.fn(),
    removerEntrenador: vi.fn(),
    listarEntrenadoresAsignados: vi.fn(),
    buscarAsignacionActiva: vi.fn(),
    listarAsignaciones: vi.fn(),
    buscarClienteRutina: vi.fn(),
    buscarEjercicioCliente: vi.fn(),
    actualizarEjercicioCliente: vi.fn(),
    actualizarClienteRutina: vi.fn(),
    listarRutinasDeCliente: vi.fn(),
    crearNotificacion: vi.fn(),
  }
})

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('../repositories/rutina.repository', () => ({
  rutinaRepository: {
    listarPorGimnasio,
    buscarPorId,
    buscarBasicaPorId,
    crear,
    actualizar,
    eliminar,
    agregarEjercicios,
    eliminarEjercicios,
    asignarEntrenador,
    removerEntrenador,
    listarEntrenadoresAsignados,
    buscarAsignacionActiva,
    listarAsignaciones,
    buscarClienteRutina,
    buscarEjercicioCliente,
    actualizarEjercicioCliente,
    actualizarClienteRutina,
    listarRutinasDeCliente,
  },
}))
vi.mock('./notification-factory.service', () => ({
  notificationFactory: { crear: crearNotificacion },
}))

import { rutinaService } from './rutina.service'

const admin = { actorId: 1n, gymId: 1n, actorType: 'STAFF' as const, role: 'Administrador' as const }
const trainer = { actorId: 7n, gymId: 1n, actorType: 'STAFF' as const, role: 'Entrenador' as const }

const dtoEjercicios = [
  { id_ejercicio: 1, series: 3, repeticiones: 10, notas: 'x', orden: 1 },
  { id_ejercicio: 2, series: 4, repeticiones: 8 },
]

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.$transaction = transaction
  buscarAsignacionActiva.mockResolvedValue(null)
})

describe('rutinaService listar', () => {
  it('lista todas las rutinas para un admin', async () => {
    listarPorGimnasio.mockResolvedValue([{ id_rutina: 1n }])
    await expect(rutinaService.listar(admin)).resolves.toEqual([{ id_rutina: 1n }])
    expect(listarPorGimnasio).toHaveBeenCalledWith(1n, undefined)
  })

  it('filtra por entrenador cuando el actor es Entrenador', async () => {
    listarPorGimnasio.mockResolvedValue([])
    await expect(rutinaService.listar(trainer)).resolves.toEqual([])
    expect(listarPorGimnasio).toHaveBeenCalledWith(1n, 7n)
  })
})

describe('rutinaService obtener', () => {
  it('retorna la rutina encontrada', async () => {
    buscarPorId.mockResolvedValue({ id_rutina: 5n, nombre: 'Push' })
    await expect(rutinaService.obtener(5n, admin)).resolves.toEqual({ id_rutina: 5n, nombre: 'Push' })
    expect(buscarPorId).toHaveBeenCalledWith(5n, 1n, undefined)
  })

  it('lanza 404 si la rutina no existe', async () => {
    buscarPorId.mockResolvedValue(null)
    await expect(rutinaService.obtener(99n, admin)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('rutinaService crear', () => {
  const dto = { nombre: 'Push', descripcion: 'Día de empuje', ejercicios: dtoEjercicios }

  it('crea una rutina como admin sin auto-asignar entrenador', async () => {
    tx.ejercicio.count.mockResolvedValue(2)
    crear.mockResolvedValue({ id_rutina: 5n })
    buscarPorId.mockResolvedValue({ id_rutina: 5n, nombre: 'Push' })
    const r = await rutinaService.crear(admin, dto)
    expect(tx.ejercicio.count).toHaveBeenCalledWith({
      where: { id_ejercicio: { in: [1n, 2n] }, id_gimnasio: 1n, estado: true },
    })
    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({ id_gimnasio: 1n, id_usuario_creador: 1n, nombre: 'Push' }),
      tx,
    )
    expect(agregarEjercicios).toHaveBeenCalledWith(5n, expect.any(Array), tx)
    expect(asignarEntrenador).not.toHaveBeenCalled()
    expect(r).toEqual({ id_rutina: 5n, nombre: 'Push' })
  })

  it('crea una rutina como entrenador y la auto-asigna', async () => {
    tx.ejercicio.count.mockResolvedValue(2)
    crear.mockResolvedValue({ id_rutina: 6n })
    buscarPorId.mockResolvedValue({ id_rutina: 6n })
    await rutinaService.crear(trainer, dto)
    expect(asignarEntrenador).toHaveBeenCalledWith(6n, 7n, tx)
  })

  it('rechaza ejercicios que no existen o son de otro gimnasio', async () => {
    tx.ejercicio.count.mockResolvedValue(1)
    await expect(rutinaService.crear(admin, dto)).rejects.toMatchObject({ statusCode: 400 })
    expect(crear).not.toHaveBeenCalled()
  })
})

describe('rutinaService actualizar', () => {
  it('actualiza metadatos y reemplaza los ejercicios', async () => {
    buscarBasicaPorId.mockResolvedValue({ id_rutina: 3n })
    tx.ejercicio.count.mockResolvedValue(2)
    buscarPorId.mockResolvedValue({ id_rutina: 3n })
    await rutinaService.actualizar(3n, admin, {
      nombre: 'Push B',
      dificultad: 'intermedio',
      ejercicios: dtoEjercicios,
    })
    expect(actualizar).toHaveBeenCalledWith(3n, expect.objectContaining({ nombre: 'Push B' }), tx)
    expect(eliminarEjercicios).toHaveBeenCalledWith(3n, tx)
    expect(agregarEjercicios).toHaveBeenCalledWith(3n, expect.any(Array), tx)
    expect(buscarPorId).toHaveBeenCalledWith(3n, 1n, undefined)
  })

  it('actualiza solo metadatos sin tocar ejercicios', async () => {
    buscarBasicaPorId.mockResolvedValue({ id_rutina: 3n })
    buscarPorId.mockResolvedValue({ id_rutina: 3n })
    await rutinaService.actualizar(3n, admin, { estado: false })
    expect(actualizar).toHaveBeenCalledWith(3n, { nombre: undefined, descripcion: undefined, objetivo: undefined, duracion_minutos: undefined, dificultad: undefined, estado: false }, tx)
    expect(eliminarEjercicios).not.toHaveBeenCalled()
  })

  it('lanza 404 si la rutina no existe', async () => {
    buscarBasicaPorId.mockResolvedValue(null)
    await expect(rutinaService.actualizar(99n, admin, { nombre: 'x' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('rutinaService eliminar', () => {
  it('elimina asignaciones, ejercicios y la rutina', async () => {
    buscarBasicaPorId.mockResolvedValue({ id_rutina: 4n })
    eliminar.mockResolvedValue({ id_rutina: 4n })
    await rutinaService.eliminar(4n, admin)
    expect(tx.clienteRutina.deleteMany).toHaveBeenCalledWith({ where: { id_rutina: 4n } })
    expect(eliminarEjercicios).toHaveBeenCalledWith(4n, tx)
    expect(eliminar).toHaveBeenCalledWith(4n, tx)
  })

  it('lanza 404 si la rutina no existe', async () => {
    buscarBasicaPorId.mockResolvedValue(null)
    await expect(rutinaService.eliminar(99n, admin)).rejects.toMatchObject({ statusCode: 404 })
    expect(eliminar).not.toHaveBeenCalled()
  })
})

describe('rutinaService asignarEntrenador', () => {
  it('asigna un entrenador válido', async () => {
    buscarBasicaPorId.mockResolvedValue({ id_rutina: 3n })
    tx.usuario.findFirst.mockResolvedValue({ id_usuario: 9n })
    tx.rutinaEntrenador.findUnique.mockResolvedValue(null)
    asignarEntrenador.mockResolvedValue({ id_rutina: 3n, id_entrenador: 9n })
    await expect(rutinaService.asignarEntrenador(3n, admin, 9n))
      .resolves.toEqual({ id_rutina: 3n, id_entrenador: 9n })
    expect(tx.usuario.findFirst).toHaveBeenCalledWith({
      where: { id_usuario: 9n, id_gimnasio: 1n, rol: 'Entrenador', estado: true },
    })
    expect(asignarEntrenador).toHaveBeenCalledWith(3n, 9n, tx)
  })

  it('lanza 404 si la rutina no existe', async () => {
    buscarBasicaPorId.mockResolvedValue(null)
    await expect(rutinaService.asignarEntrenador(99n, admin, 9n)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lanza 404 si el usuario no es un entrenador activo del gimnasio', async () => {
    buscarBasicaPorId.mockResolvedValue({ id_rutina: 3n })
    tx.usuario.findFirst.mockResolvedValue(null)
    await expect(rutinaService.asignarEntrenador(3n, admin, 9n)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lanza 409 si el entrenador ya tiene la rutina', async () => {
    buscarBasicaPorId.mockResolvedValue({ id_rutina: 3n })
    tx.usuario.findFirst.mockResolvedValue({ id_usuario: 9n })
    tx.rutinaEntrenador.findUnique.mockResolvedValue({ id_rutina: 3n })
    await expect(rutinaService.asignarEntrenador(3n, admin, 9n)).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('rutinaService removerEntrenador', () => {
  it('remueve la asignación del entrenador', async () => {
    buscarBasicaPorId.mockResolvedValue({ id_rutina: 3n })
    removerEntrenador.mockResolvedValue({ id_rutina: 3n, id_entrenador: 9n })
    await expect(rutinaService.removerEntrenador(3n, admin, 9n))
      .resolves.toEqual({ id_rutina: 3n, id_entrenador: 9n })
    expect(removerEntrenador).toHaveBeenCalledWith(3n, 9n, tx)
  })

  it('lanza 404 si la rutina no existe', async () => {
    buscarBasicaPorId.mockResolvedValue(null)
    await expect(rutinaService.removerEntrenador(99n, admin, 9n)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('rutinaService listarEntrenadoresAsignados', () => {
  it('lista entrenadores de la rutina', async () => {
    buscarPorId.mockResolvedValue({ id_rutina: 3n })
    listarEntrenadoresAsignados.mockResolvedValue([{ id_usuario: 9n }])
    await expect(rutinaService.listarEntrenadoresAsignados(3n, admin))
      .resolves.toEqual([{ id_usuario: 9n }])
    expect(listarEntrenadoresAsignados).toHaveBeenCalledWith(3n, 1n)
  })

  it('lanza 404 si la rutina no existe', async () => {
    buscarPorId.mockResolvedValue(null)
    await expect(rutinaService.listarEntrenadoresAsignados(99n, admin)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('rutinaService asignarCliente', () => {
  it('deniega una rutina que no pertenece o no está asignada al entrenador', async () => {
    buscarBasicaPorId.mockResolvedValue(null)
    await expect(rutinaService.asignarCliente(99n, trainer, { id_cliente: 3 }))
      .rejects.toMatchObject({ statusCode: 404 })
    expect(buscarBasicaPorId).toHaveBeenCalledWith(99n, 1n, 7n, tx)
    expect(tx.cliente.findFirst).not.toHaveBeenCalled()
  })

  it('deniega un cliente ajeno o de otro gimnasio', async () => {
    buscarBasicaPorId.mockResolvedValue({ id_rutina: 2n, nombre: 'A' })
    tx.cliente.findFirst.mockResolvedValue(null)
    await expect(rutinaService.asignarCliente(2n, trainer, { id_cliente: 88 }))
      .rejects.toMatchObject({ statusCode: 404 })
    expect(tx.cliente.findFirst).toHaveBeenCalledWith({
      where: { id_cliente: 88n, id_gimnasio: 1n, estado: true, id_entrenador: 7n },
    })
  })

  it('lanza 409 si el cliente ya tiene la rutina activa', async () => {
    buscarBasicaPorId.mockResolvedValue({ id_rutina: 2n, nombre: 'A' })
    tx.cliente.findFirst.mockResolvedValue({ id_cliente: 88n })
    buscarAsignacionActiva.mockResolvedValue({ id_cliente_rutina: 10n })
    await expect(rutinaService.asignarCliente(2n, admin, { id_cliente: 88 }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('asigna la rutina, clona los ejercicios y notifica al cliente', async () => {
    buscarBasicaPorId.mockResolvedValue({ id_rutina: 2n, nombre: 'Full' })
    tx.cliente.findFirst.mockResolvedValue({ id_cliente: 88n })
    tx.clienteRutina.create.mockResolvedValue({ id_cliente_rutina: 10n })
    tx.rutinaEjercicio.findMany.mockResolvedValue([
      {
        id_ejercicio: 1n,
        series: 3,
        repeticiones: 10,
        peso_sugerido: null,
        descanso: null,
        notas: 'x',
        orden: 1,
        ejercicio: { nombre: 'Press', grupo_muscular: 'Pecho' },
      },
    ])
    tx.clienteRutinaEjercicio.createMany.mockResolvedValue({ count: 1 })

    const r = await rutinaService.asignarCliente(2n, admin, { id_cliente: 88 })

    expect(tx.clienteRutina.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ id_cliente: 88n, id_rutina: 2n, estado: 'activa' }),
    })
    expect(tx.rutinaEjercicio.findMany).toHaveBeenCalledWith({
      where: { id_rutina: 2n },
      include: { ejercicio: { select: { nombre: true, grupo_muscular: true } } },
      orderBy: { orden: 'asc' },
    })
    expect(tx.clienteRutinaEjercicio.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ id_cliente_rutina: 10n, nombre: 'Press', grupo_muscular: 'Pecho', series: 3 })],
    })
    expect(crearNotificacion).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'SISTEMA', destino: { id_cliente: 88n }, titulo: 'Rutina asignada' }),
      tx,
    )
    expect(r).toEqual({ id_cliente_rutina: 10n })
  })
})

describe('rutinaService obtenerClienteRutina', () => {
  it('retorna la asignación', async () => {
    buscarClienteRutina.mockResolvedValue({ id_cliente_rutina: 10n })
    await expect(rutinaService.obtenerClienteRutina(10n, trainer))
      .resolves.toEqual({ id_cliente_rutina: 10n })
    expect(buscarClienteRutina).toHaveBeenCalledWith(10n, 1n, 7n)
  })

  it('lanza 404 si la asignación no existe', async () => {
    buscarClienteRutina.mockResolvedValue(null)
    await expect(rutinaService.obtenerClienteRutina(99n, admin)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('rutinaService actualizarEjercicioCliente', () => {
  it('actualiza un ejercicio de la asignación', async () => {
    buscarEjercicioCliente.mockResolvedValue({ id_cliente_rutina_ejercicio: 1n })
    actualizarEjercicioCliente.mockResolvedValue({ id_cliente_rutina_ejercicio: 1n })
    await expect(rutinaService.actualizarEjercicioCliente(1n, admin, { series: 5 }))
      .resolves.toEqual({ id_cliente_rutina_ejercicio: 1n })
    expect(buscarEjercicioCliente).toHaveBeenCalledWith(1n, 1n, undefined, tx)
    expect(actualizarEjercicioCliente).toHaveBeenCalledWith(1n, { series: 5 }, tx)
  })

  it('lanza 404 si el ejercicio no existe', async () => {
    buscarEjercicioCliente.mockResolvedValue(null)
    await expect(rutinaService.actualizarEjercicioCliente(99n, admin, { series: 5 }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('rutinaService actualizarClienteRutina', () => {
  it('actualiza la asignación con fechas convertidas', async () => {
    buscarClienteRutina.mockResolvedValue({ id_cliente_rutina: 10n })
    actualizarClienteRutina.mockResolvedValue({ id_cliente_rutina: 10n })
    await expect(rutinaService.actualizarClienteRutina(10n, admin, { fecha_inicio: '2026-01-01' }))
      .resolves.toEqual({ id_cliente_rutina: 10n })
    expect(actualizarClienteRutina).toHaveBeenCalledWith(
      10n,
      expect.objectContaining({ fecha_inicio: new Date('2026-01-01'), estado: undefined }),
      tx,
    )
  })

  it('lanza 404 si la asignación no existe', async () => {
    buscarClienteRutina.mockResolvedValue(null)
    await expect(rutinaService.actualizarClienteRutina(99n, admin, { observaciones: 'y' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('rutinaService listarRutinasDeCliente', () => {
  it('lista rutinas de un cliente para un admin', async () => {
    prismaMock.cliente.findFirst.mockResolvedValue({ id_cliente: 88n })
    listarRutinasDeCliente.mockResolvedValue([{ id_cliente_rutina: 10n }])
    await expect(rutinaService.listarRutinasDeCliente(88n, admin))
      .resolves.toEqual([{ id_cliente_rutina: 10n }])
    expect(prismaMock.cliente.findFirst).toHaveBeenCalledWith({
      where: { id_cliente: 88n, id_gimnasio: 1n },
      select: { id_cliente: true },
    })
    expect(listarRutinasDeCliente).toHaveBeenCalledWith(88n, 1n, undefined)
  })

  it('lanza 404 si el cliente no pertenece al gimnasio', async () => {
    prismaMock.cliente.findFirst.mockResolvedValue(null)
    await expect(rutinaService.listarRutinasDeCliente(88n, admin)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('rutinaService listarAsignaciones', () => {
  it('lista asignaciones de la rutina', async () => {
    buscarPorId.mockResolvedValue({ id_rutina: 2n })
    listarAsignaciones.mockResolvedValue([{ id_cliente_rutina: 10n }])
    await expect(rutinaService.listarAsignaciones(2n, admin))
      .resolves.toEqual([{ id_cliente_rutina: 10n }])
    expect(listarAsignaciones).toHaveBeenCalledWith(2n, 1n, undefined)
  })

  it('lanza 404 si la rutina no existe', async () => {
    buscarPorId.mockResolvedValue(null)
    await expect(rutinaService.listarAsignaciones(99n, admin)).rejects.toMatchObject({ statusCode: 404 })
  })
})
