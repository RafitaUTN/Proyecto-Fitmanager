/**
 * Pruebas automatizadas para programacion-rutina.service.
 *
 * @remarks Documenta RBAC, reglas de conflicto de horario, validaciones de
 * negocios y notificaciones del calendario de sesiones de rutina.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  tx,
  transaction,
  prismaMock,
  listar,
  buscarPorId,
  conflictosEntrenador,
  conflictosClientes,
  crearNotificacion,
} = vi.hoisted(() => {
  const transactionClient = {
    rutina: { findFirst: vi.fn() },
    usuario: { findFirst: vi.fn() },
    cliente: { findFirst: vi.fn(), findMany: vi.fn() },
    programacionRutina: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    programacionRutinaNivel: { deleteMany: vi.fn(), createMany: vi.fn() },
    programacionRutinaCliente: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  }
  const prismaMock = {
    $transaction: undefined as unknown,
    programacionRutina: { findMany: vi.fn(), findFirst: vi.fn() },
    cliente: { findFirst: vi.fn() },
  }
  return {
    tx: transactionClient,
    transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) => callback(transactionClient)),
    prismaMock,
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    conflictosEntrenador: vi.fn(),
    conflictosClientes: vi.fn(),
    crearNotificacion: vi.fn(),
  }
})

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('../repositories/programacion-rutina.repository', () => ({
  programacionRutinaRepository: { listar, buscarPorId, conflictosEntrenador, conflictosClientes },
  programacionRutinaInclude: {},
}))
vi.mock('./notification-factory.service', () => ({
  notificationFactory: { crear: crearNotificacion },
}))

import { programacionRutinaService } from './programacion-rutina.service'

const admin = { actorId: 1n, gymId: 1n, actorType: 'STAFF' as const, role: 'Administrador' as const }
const trainer = { actorId: 7n, gymId: 1n, actorType: 'STAFF' as const, role: 'Entrenador' as const }
const receptionist = { actorId: 3n, gymId: 1n, actorType: 'STAFF' as const, role: 'Recepcionista' as const }
const clienteCtx = { actorId: 7n, gymId: 1n, actorType: 'CLIENTE' as const, role: 'Cliente' as const }

const dtoCrear = {
  id_rutina: 1,
  id_entrenador: 2,
  fecha: '2026-09-15',
  hora_inicio: '2026-09-15T09:00:00-06:00',
  hora_fin: '2026-09-15T10:00:00-06:00',
  niveles: ['TODOS'] as ('PRINCIPIANTE' | 'INTERMEDIO' | 'AVANZADO' | 'EXPERTO' | 'TODOS')[],
  clientes: [7],
  capacidad: 10,
  notas: 'rutina de prueba',
}

function prepararValidacionBase() {
  tx.rutina.findFirst.mockResolvedValue({ id_rutina: 1n, nombre: 'Full Body' })
  tx.usuario.findFirst.mockResolvedValue({ id_usuario: 2n, nombre: 'Sofia', apellido: 'Vargas' })
  tx.cliente.findMany.mockResolvedValue([{ id_cliente: 7n, nombre: 'Juan', apellido: 'Perez' }])
  conflictosEntrenador.mockResolvedValue([])
  conflictosClientes.mockResolvedValue([])
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.$transaction = transaction
  prepararValidacionBase()
})

describe('programacionRutinaService listar', () => {
  it('rechaza a recepcionistas', async () => {
    await expect(programacionRutinaService.listar(receptionist, {
      desde: '2026-09-01',
      hasta: '2026-09-30',
      page: 1,
      pageSize: 25,
    })).rejects.toMatchObject({ statusCode: 403, codigo: 'FORBIDDEN' })
  })

  it('admin filtra por entrenador y normaliza el rango de fechas', async () => {
    listar.mockResolvedValue({ data: [{ id_programacion: 1n }], total: 1 })
    const result = await programacionRutinaService.listar(admin, {
      desde: '2026-09-01',
      hasta: '2026-09-30',
      id_entrenador: 2,
      page: 2,
      pageSize: 10,
    })
    const [, filtros] = listar.mock.calls[0]
    expect(filtros.hasta.getHours()).toBe(23)
    expect(filtros.id_entrenador).toBe(2n)
    expect(filtros.id_rutina).toBeUndefined()
    expect(result).toEqual({ data: [{ id_programacion: 1n }], total: 1, page: 2, pageSize: 10, totalPages: 1 })
  })

  it('entrenador siempre queda acotado a sus propias sesiones', async () => {
    listar.mockResolvedValue({ data: [], total: 0 })
    await programacionRutinaService.listar(trainer, {
      desde: '2026-09-01',
      hasta: '2026-09-30',
      id_entrenador: 99,
      page: 1,
      pageSize: 25,
    })
    const [, filtros] = listar.mock.calls[0]
    expect(filtros.id_entrenador).toBe(7n)
  })
})

describe('programacionRutinaService crear', () => {
  it('rechaza a recepcionistas', async () => {
    await expect(programacionRutinaService.crear(receptionist, dtoCrear)).rejects.toMatchObject({
      statusCode: 403,
      codigo: 'FORBIDDEN',
    })
  })

  it('entrenador solo puede programar para si mismo', async () => {
    await expect(programacionRutinaService.crear(trainer, dtoCrear)).rejects.toMatchObject({
      statusCode: 403,
      codigo: 'FORBIDDEN',
    })
  })

  it('rechaza rango inválido', async () => {
    await expect(programacionRutinaService.crear(admin, { ...dtoCrear, hora_fin: '2026-09-15T08:00:00-06:00' })).rejects.toMatchObject({
      statusCode: 400,
      codigo: 'RANGO_INVALIDO',
    })
  })

  it('rechaza capacidad excedida', async () => {
    await expect(programacionRutinaService.crear(admin, { ...dtoCrear, capacidad: 1, clientes: [7, 8] })).rejects.toMatchObject({
      statusCode: 422,
      codigo: 'CAPACIDAD_EXCEDIDA',
    })
  })

  it('rechaza rutina inexistente', async () => {
    tx.rutina.findFirst.mockResolvedValue(null)
    await expect(programacionRutinaService.crear(admin, dtoCrear)).rejects.toMatchObject({
      statusCode: 404,
      codigo: 'RESOURCE_NOT_ACCESSIBLE',
    })
  })

  it('rechaza entrenador inexistente', async () => {
    tx.usuario.findFirst.mockResolvedValue(null)
    await expect(programacionRutinaService.crear(admin, dtoCrear)).rejects.toMatchObject({
      statusCode: 404,
      codigo: 'RESOURCE_NOT_ACCESSIBLE',
    })
  })

  it('rechaza clientes de otro gimnasio', async () => {
    tx.cliente.findMany.mockResolvedValue([{ id_cliente: 7n }])
    await expect(programacionRutinaService.crear(admin, { ...dtoCrear, clientes: [7, 8] })).rejects.toMatchObject({
      statusCode: 404,
      codigo: 'RESOURCE_NOT_ACCESSIBLE',
    })
  })

  it('rechaza conflicto de horario del entrenador', async () => {
    conflictosEntrenador.mockResolvedValue([{ id_programacion: 4n }])
    await expect(programacionRutinaService.crear(admin, dtoCrear)).rejects.toMatchObject({
      statusCode: 409,
      codigo: 'CONFLICTO_HORARIO_ENTRENADOR',
    })
  })

  it('rechaza conflicto de horario de un cliente', async () => {
    conflictosClientes.mockResolvedValue([{ id_cliente: 7n, id_programacion: 4n }])
    await expect(programacionRutinaService.crear(admin, dtoCrear)).rejects.toMatchObject({
      statusCode: 409,
      codigo: 'CONFLICTO_HORARIO_CLIENTE',
    })
  })

  it('crea la sesión, normaliza niveles y notifica a los clientes', async () => {
    tx.programacionRutina.create.mockResolvedValue({ id_programacion: 9n })
    buscarPorId.mockResolvedValue({ id_programacion: 9n })

    const result = await programacionRutinaService.crear(admin, dtoCrear)

    expect(tx.programacionRutina.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id_gimnasio: 1n,
        id_rutina: 1n,
        id_entrenador: 2n,
        niveles: { createMany: { data: [{ nivel: 'TODOS' }] } },
        clientes: { createMany: { data: [{ id_cliente: 7n }] } },
      }),
    })
    expect(crearNotificacion).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id_programacion: 9n })
  })
})

describe('programacionRutinaService actualizar', () => {
  it('rechaza sesión inexistente', async () => {
    buscarPorId.mockResolvedValue(null)
    await expect(programacionRutinaService.actualizar(5n, admin, { notas: 'x' })).rejects.toMatchObject({
      statusCode: 404,
      codigo: 'RESOURCE_NOT_ACCESSIBLE',
    })
  })

  it('rechaza editar una sesión cancelada', async () => {
    buscarPorId.mockResolvedValue({ id_programacion: 5n, estado: 'CANCELADA', id_rutina: 1n, id_entrenador: 2n, clientes: [], niveles: [] })
    await expect(programacionRutinaService.actualizar(5n, admin, { notas: 'x' })).rejects.toMatchObject({
      statusCode: 422,
      codigo: 'SESION_CANCELADA',
    })
  })

  it('reemplaza niveles y clientes cuando llegan en el dto', async () => {
    buscarPorId.mockResolvedValue({
      id_programacion: 5n,
      estado: 'PROGRAMADA',
      id_rutina: 1n,
      id_entrenador: 2n,
      fecha: new Date('2026-09-15T00:00:00'),
      hora_inicio: new Date('2026-09-15T09:00:00'),
      hora_fin: new Date('2026-09-15T10:00:00'),
      clientes: [{ id_cliente: 7n }],
      niveles: [{ nivel: 'TODOS' }],
    })
    tx.cliente.findMany.mockResolvedValue([{ id_cliente: 7n }, { id_cliente: 8n }])
    tx.programacionRutina.update.mockResolvedValue({ id_programacion: 5n })
    tx.programacionRutinaNivel.deleteMany.mockResolvedValue({ count: 1 })
    tx.programacionRutinaNivel.createMany.mockResolvedValue({ count: 1 })
    tx.programacionRutinaCliente.deleteMany.mockResolvedValue({ count: 1 })
    tx.programacionRutinaCliente.createMany.mockResolvedValue({ count: 1 })
    buscarPorId.mockResolvedValue({ id_programacion: 5n })

    await programacionRutinaService.actualizar(5n, admin, {
      clientes: [7, 8],
      niveles: ['INTERMEDIO'],
      hora_inicio: '2026-09-15T11:00:00-06:00',
      hora_fin: '2026-09-15T12:00:00-06:00',
    })

    expect(tx.programacionRutinaNivel.createMany).toHaveBeenCalledWith({
      data: [{ id_programacion: 5n, nivel: 'INTERMEDIO' }],
    })
    expect(tx.programacionRutinaCliente.createMany).toHaveBeenCalledWith({
      data: [{ id_programacion: 5n, id_cliente: 7n }, { id_programacion: 5n, id_cliente: 8n }],
      skipDuplicates: true,
    })
    expect(crearNotificacion).toHaveBeenCalledTimes(2)
  })
})

describe('programacionRutinaService cancelar', () => {
  it('rechaza sesión inexistente', async () => {
    prismaMock.programacionRutina.findFirst.mockResolvedValue(null)
    await expect(programacionRutinaService.cancelar(5n, admin)).rejects.toMatchObject({
      statusCode: 404,
      codigo: 'RESOURCE_NOT_ACCESSIBLE',
    })
  })

  it('entrenador solo puede cancelar sus propias sesiones', async () => {
    prismaMock.programacionRutina.findFirst.mockResolvedValue({ id_programacion: 5n, id_entrenador: 9n, estado: 'PROGRAMADA' })
    await expect(programacionRutinaService.cancelar(5n, trainer)).rejects.toMatchObject({
      statusCode: 403,
      codigo: 'FORBIDDEN',
    })
  })

  it('rechaza cancelar dos veces', async () => {
    prismaMock.programacionRutina.findFirst.mockResolvedValue({ id_programacion: 5n, id_entrenador: 2n, estado: 'CANCELADA' })
    await expect(programacionRutinaService.cancelar(5n, admin)).rejects.toMatchObject({
      statusCode: 409,
      codigo: 'SESION_CANCELADA',
    })
  })

  it('cancela la sesión y notifica a los clientes asignados', async () => {
    prismaMock.programacionRutina.findFirst.mockResolvedValue({
      id_programacion: 5n,
      id_entrenador: 2n,
      estado: 'PROGRAMADA',
      rutina: { nombre: 'Full Body' },
      clientes: [{ id_cliente: 7n }, { id_cliente: 8n }],
    })
    tx.programacionRutina.update.mockResolvedValue({ id_programacion: 5n })

    const result = await programacionRutinaService.cancelar(5n, admin, 'Emergencia')

    expect(tx.programacionRutina.update).toHaveBeenCalledWith({
      where: { id_programacion: 5n },
      data: { estado: 'CANCELADA', cancelada_en: expect.any(Date), cancelada_por: 1n, motivo_cancelacion: 'Emergencia' },
    })
    expect(crearNotificacion).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ ok: true })
  })
})

describe('programacionRutinaService calendarioCliente', () => {
  it('rechaza a staff', async () => {
    await expect(programacionRutinaService.calendarioCliente(admin, '2026-09-01', '2026-09-30')).rejects.toMatchObject({
      statusCode: 403,
      codigo: 'FORBIDDEN',
    })
  })

  it('rechaza cliente inexistente', async () => {
    prismaMock.cliente.findFirst.mockResolvedValue(null)
    await expect(programacionRutinaService.calendarioCliente(clienteCtx, '2026-09-01', '2026-09-30')).rejects.toMatchObject({
      statusCode: 404,
      codigo: 'RESOURCE_NOT_ACCESSIBLE',
    })
  })

  it('devuelve sesiones en rango con OR de nivel y asignación', async () => {
    prismaMock.cliente.findFirst.mockResolvedValue({ nivel: 'INTERMEDIO' })
    prismaMock.programacionRutina.findMany.mockResolvedValue([{ id_programacion: 5n }])

    const result = await programacionRutinaService.calendarioCliente(clienteCtx, '2026-09-01', '2026-09-30')

    const where = prismaMock.programacionRutina.findMany.mock.calls[0][0].where
    expect(where.id_gimnasio).toBe(1n)
    expect(where.estado).toEqual({ not: 'CANCELADA' })
    expect(where.OR).toContainEqual({ clientes: { some: { id_cliente: 7n } } })
    expect(where.OR).toContainEqual({ niveles: { some: { nivel: 'TODOS' } } })
    expect(result).toEqual([{ id_programacion: 5n }])
  })

  it('convierte el rango hasta en fin de día', async () => {
    prismaMock.cliente.findFirst.mockResolvedValue({ nivel: 'TODOS' as any })
    prismaMock.programacionRutina.findMany.mockResolvedValue([])
    await programacionRutinaService.calendarioCliente(clienteCtx, '2026-09-01', '2026-09-30')
    const fecha = prismaMock.programacionRutina.findMany.mock.calls[0][0].where.fecha
    expect(fecha.lte.getHours()).toBe(23)
  })
})

describe('programacionRutinaService completarCliente', () => {
  it('rechaza a staff', async () => {
    await expect(programacionRutinaService.completarCliente(admin, 5n)).rejects.toMatchObject({
      statusCode: 403,
      codigo: 'FORBIDDEN',
    })
  })

  it('rechaza sesión inexistente', async () => {
    tx.programacionRutina.findFirst.mockResolvedValue(null)
    await expect(programacionRutinaService.completarCliente(clienteCtx, 5n)).rejects.toMatchObject({
      statusCode: 404,
      codigo: 'RESOURCE_NOT_ACCESSIBLE',
    })
  })

  it('rechaza sesión cancelada y futura', async () => {
    tx.programacionRutina.findFirst.mockResolvedValue({
      id_programacion: 5n,
      estado: 'CANCELADA',
      hora_inicio: new Date(Date.now() - 3_600_000),
      clientes: [],
      niveles: [],
    })
    await expect(programacionRutinaService.completarCliente(clienteCtx, 5n)).rejects.toMatchObject({
      statusCode: 422,
      codigo: 'SESION_CANCELADA',
    })

    tx.programacionRutina.findFirst.mockResolvedValue({
      id_programacion: 5n,
      estado: 'PROGRAMADA',
      hora_inicio: new Date(Date.now() + 3_600_000),
      clientes: [],
      niveles: [],
    })
    await expect(programacionRutinaService.completarCliente(clienteCtx, 5n)).rejects.toMatchObject({
      statusCode: 422,
      codigo: 'SESION_FUTURA',
    })
  })

  it('rechaza sesión no asignada y sin nivel permitido', async () => {
    tx.programacionRutina.findFirst.mockResolvedValue({
      id_programacion: 5n,
      estado: 'PROGRAMADA',
      hora_inicio: new Date(Date.now() - 3_600_000),
      clientes: [{ id_cliente: 999n }],
      niveles: [{ nivel: 'EXPERTOS' }],
    })
    tx.cliente.findFirst.mockResolvedValue({ nivel: 'PRINCIPIANTE' })
    await expect(programacionRutinaService.completarCliente(clienteCtx, 5n)).rejects.toMatchObject({
      statusCode: 403,
      codigo: 'FORBIDDEN',
    })
  })

  it('marca como completada una asignación existente', async () => {
    tx.programacionRutina.findFirst.mockResolvedValue({
      id_programacion: 5n,
      estado: 'EN_CURSO',
      hora_inicio: new Date(Date.now() - 3_600_000),
      clientes: [{ id_cliente: 7n }],
      niveles: [],
    })
    tx.cliente.findFirst.mockResolvedValue({ nivel: 'PRINCIPIANTE' })
    tx.programacionRutinaCliente.findUnique.mockResolvedValue({ id_programacion_cliente: 50n, completada: false })
    tx.programacionRutinaCliente.update.mockResolvedValue({ id_programacion_cliente: 50n, completada: true })

    const result = await programacionRutinaService.completarCliente(clienteCtx, 5n)

    expect(tx.programacionRutinaCliente.update).toHaveBeenCalledWith({
      where: { id_programacion_cliente: 50n },
      data: { completada: true, completada_en: expect.any(Date) },
    })
    expect(tx.programacionRutinaCliente.create).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
  })

  it('crea la asignación completada cuando el nivel aplica', async () => {
    tx.programacionRutina.findFirst.mockResolvedValue({
      id_programacion: 5n,
      estado: 'PROGRAMADA',
      hora_inicio: new Date(Date.now() - 3_600_000),
      clientes: [],
      niveles: [{ nivel: 'TODOS' }],
    })
    tx.cliente.findFirst.mockResolvedValue({ nivel: 'PRINCIPIANTE' })
    tx.programacionRutinaCliente.findUnique.mockResolvedValue(null)
    tx.programacionRutinaCliente.create.mockResolvedValue({ id_programacion_cliente: 51n })

    const result = await programacionRutinaService.completarCliente(clienteCtx, 5n)

    expect(tx.programacionRutinaCliente.create).toHaveBeenCalledWith({
      data: { id_programacion: 5n, id_cliente: 7n, completada: true, completada_en: expect.any(Date) },
    })
    expect(result.ok).toBe(true)
  })
})