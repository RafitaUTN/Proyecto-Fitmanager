/**
 * Pruebas unitarias de rutina.service
 *
 * Cubre RF-13 ("permitir a los entrenadores crear, consultar, actualizar y
 * asignar rutinas de entrenamiento a los clientes registrados"), que es
 * "Must" en el backlog.
 *
 * Dos comportamientos que no son evidentes leyendo el código y que conviene
 * dejar fijados:
 *
 *  1. Al asignar una rutina a un cliente se guarda una COPIA de los
 *     ejercicios (nombre, grupo muscular, series, repeticiones, peso), no una
 *     referencia. Así, si mañana se edita la rutina plantilla, la rutina que
 *     ya está siguiendo el cliente no cambia bajo sus pies.
 *
 *  2. Un entrenador solo puede asignar rutinas a los clientes que tiene
 *     asignados, no a cualquiera del gimnasio.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const GIMNASIO = 1n
const OTRO_GIMNASIO = 2n
const ID_RUTINA = 100n
const ID_CLIENTE = 10n
const ID_ENTRENADOR = 40n

const tx = {}

vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((cb: (t: unknown) => unknown) => cb(tx)),
    usuario: { findUnique: vi.fn() },
    rutina: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    rutinaEjercicio: { createMany: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    rutinaEntrenador: { findUnique: vi.fn() },
    clienteRutina: { create: vi.fn(), deleteMany: vi.fn() },
    clienteRutinaEjercicio: { createMany: vi.fn() },
  },
}))

vi.mock('../repositories/rutina.repository', () => ({
  rutinaRepository: {
    listarPorGimnasio: vi.fn(),
    buscarPorId: vi.fn(),
    asignarEntrenador: vi.fn(),
    removerEntrenador: vi.fn(),
    listarEntrenadoresAsignados: vi.fn(),
    buscarAsignacionActiva: vi.fn(),
    buscarClienteRutina: vi.fn(),
    actualizarEjercicioCliente: vi.fn(),
    actualizarClienteRutina: vi.fn(),
    listarRutinasDeCliente: vi.fn(),
    listarAsignaciones: vi.fn(),
  },
}))

vi.mock('../repositories/ejercicio.repository', () => ({
  ejercicioRepository: { listarPorIds: vi.fn() },
}))

vi.mock('../repositories/cliente.repository', () => ({
  clienteRepository: { buscarPorId: vi.fn() },
}))

vi.mock('./notification-factory.service', () => ({
  notificationFactory: { crear: vi.fn() },
}))

import { rutinaService } from './rutina.service'
import { rutinaRepository } from '../repositories/rutina.repository'
import { ejercicioRepository } from '../repositories/ejercicio.repository'
import { clienteRepository } from '../repositories/cliente.repository'
import { notificationFactory } from './notification-factory.service'
import { prisma } from '../lib/prisma'

const rutina = {
  id_rutina: ID_RUTINA,
  id_gimnasio: GIMNASIO,
  nombre: 'Full Body Principiante',
  descripcion: 'Rutina de tres días',
}

const cliente = {
  id_cliente: ID_CLIENTE,
  id_gimnasio: GIMNASIO,
  id_entrenador: ID_ENTRENADOR,
  estado: true,
  nombre: 'Ana',
  apellido: 'Rojas',
}

const dtoCrear = {
  nombre: 'Full Body',
  descripcion: 'Tres días',
  ejercicios: [
    { id_ejercicio: '1', series: 3, repeticiones: 12, peso_sugerido: 20 },
    { id_ejercicio: '2', series: 4, repeticiones: 10, peso_sugerido: 30 },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(rutinaRepository.buscarPorId).mockResolvedValue(rutina as never)
  vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(cliente as never)
  vi.mocked(rutinaRepository.buscarAsignacionActiva).mockResolvedValue(null as never)
  vi.mocked(ejercicioRepository.listarPorIds).mockResolvedValue([{ id: 1n }, { id: 2n }] as never)
  vi.mocked(prisma.rutina.create).mockResolvedValue({ id_rutina: ID_RUTINA } as never)
  vi.mocked(prisma.rutina.findUnique).mockResolvedValue(rutina as never)
  vi.mocked(prisma.rutinaEjercicio.createMany).mockResolvedValue({} as never)
  vi.mocked(prisma.rutinaEjercicio.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.clienteRutina.create).mockResolvedValue({ id_cliente_rutina: 700n } as never)
  vi.mocked(prisma.clienteRutinaEjercicio.createMany).mockResolvedValue({} as never)
  vi.mocked(notificationFactory.crear).mockResolvedValue(undefined as never)
})

// ===========================================================================
describe('RF-13 · Creación de rutinas', () => {
  it('crea la rutina con sus ejercicios', async () => {
    await rutinaService.crear(GIMNASIO, 7n, dtoCrear as never)

    const datos = vi.mocked(prisma.rutina.create).mock.calls[0][0] as {
      data: { id_gimnasio: bigint; id_usuario_creador: bigint }
    }
    expect(datos.data.id_gimnasio).toBe(GIMNASIO)
    expect(datos.data.id_usuario_creador).toBe(7n)
    expect(prisma.rutinaEjercicio.createMany).toHaveBeenCalled()
  })

  it('rechaza ejercicios que no pertenecen al gimnasio', async () => {
    // El repositorio filtra por gimnasio, así que si devuelve menos de los
    // pedidos es que alguno era ajeno o inexistente.
    vi.mocked(ejercicioRepository.listarPorIds).mockResolvedValue([{ id: 1n }] as never)

    await expect(rutinaService.crear(GIMNASIO, 7n, dtoCrear as never)).rejects.toMatchObject({
      message: 'Uno o más ejercicios no existen o no pertenecen a este gimnasio',
      statusCode: 400,
    })

    expect(prisma.rutina.create).not.toHaveBeenCalled()
  })

  it('conserva series, repeticiones y peso de cada ejercicio', async () => {
    await rutinaService.crear(GIMNASIO, 7n, dtoCrear as never)

    const argumento = vi.mocked(prisma.rutinaEjercicio.createMany).mock.calls[0][0] as {
      data: Array<{ series: number; repeticiones: number; peso_sugerido: number }>
    }
    expect(argumento.data[0]).toMatchObject({ series: 3, repeticiones: 12, peso_sugerido: 20 })
    expect(argumento.data[1]).toMatchObject({ series: 4, repeticiones: 10, peso_sugerido: 30 })
  })
})

// ===========================================================================
describe('RF-13 · Aislamiento de rutinas', () => {
  beforeEach(() => {
    vi.mocked(rutinaRepository.buscarPorId).mockResolvedValue({
      ...rutina,
      id_gimnasio: OTRO_GIMNASIO,
    } as never)
  })

  it('no permite consultar una rutina de otro gimnasio', async () => {
    await expect(rutinaService.obtener(ID_RUTINA, GIMNASIO)).rejects.toMatchObject({
      message: 'Rutina no encontrada',
      statusCode: 404,
    })
  })

  it('no permite modificar una rutina de otro gimnasio', async () => {
    await expect(
      rutinaService.actualizar(ID_RUTINA, GIMNASIO, { nombre: 'Robada' } as never),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(prisma.rutina.update).not.toHaveBeenCalled()
  })

  it('no permite eliminar una rutina de otro gimnasio', async () => {
    await expect(rutinaService.eliminar(ID_RUTINA, GIMNASIO)).rejects.toMatchObject({
      statusCode: 404,
    })

    expect(prisma.rutina.delete).not.toHaveBeenCalled()
  })
})

// ===========================================================================
describe('RF-13 · Asignación de rutina a entrenador', () => {
  const entrenador = { id_usuario: ID_ENTRENADOR, id_gimnasio: GIMNASIO, rol: 'Entrenador' }

  beforeEach(() => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(entrenador as never)
    vi.mocked(prisma.rutinaEntrenador.findUnique).mockResolvedValue(null as never)
    vi.mocked(rutinaRepository.asignarEntrenador).mockResolvedValue({} as never)
  })

  it('asigna la rutina a un entrenador válido', async () => {
    await rutinaService.asignarEntrenador(ID_RUTINA, GIMNASIO, ID_ENTRENADOR)

    expect(rutinaRepository.asignarEntrenador).toHaveBeenCalledWith(ID_RUTINA, ID_ENTRENADOR)
  })

  it('rechaza a un usuario que no es Entrenador', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      ...entrenador,
      rol: 'Recepcionista',
    } as never)

    await expect(
      rutinaService.asignarEntrenador(ID_RUTINA, GIMNASIO, ID_ENTRENADOR),
    ).rejects.toMatchObject({ message: 'Entrenador no válido', statusCode: 404 })
  })

  it('rechaza a un entrenador de otro gimnasio', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      ...entrenador,
      id_gimnasio: OTRO_GIMNASIO,
    } as never)

    await expect(
      rutinaService.asignarEntrenador(ID_RUTINA, GIMNASIO, ID_ENTRENADOR),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('impide asignar dos veces la misma rutina al mismo entrenador', async () => {
    vi.mocked(prisma.rutinaEntrenador.findUnique).mockResolvedValue({ id: 1n } as never)

    await expect(
      rutinaService.asignarEntrenador(ID_RUTINA, GIMNASIO, ID_ENTRENADOR),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect(rutinaRepository.asignarEntrenador).not.toHaveBeenCalled()
  })
})

// ===========================================================================
describe('RF-13 · Asignación de rutina a cliente', () => {
  it('crea la asignación en estado activa', async () => {
    await rutinaService.asignarCliente(ID_RUTINA, GIMNASIO, { id_cliente: '10' } as never)

    const datos = vi.mocked(prisma.clienteRutina.create).mock.calls[0][0] as {
      data: { estado: string; id_cliente: bigint; id_rutina: bigint }
    }
    expect(datos.data.estado).toBe('activa')
    expect(datos.data.id_cliente).toBe(ID_CLIENTE)
    expect(datos.data.id_rutina).toBe(ID_RUTINA)
  })

  it('un entrenador NO puede asignar rutinas a clientes ajenos', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue({
      ...cliente,
      id_entrenador: 999n, // el cliente es de otro entrenador
    } as never)

    await expect(
      rutinaService.asignarCliente(
        ID_RUTINA, GIMNASIO, { id_cliente: '10' } as never, ID_ENTRENADOR,
      ),
    ).rejects.toMatchObject({
      message: 'Solo puedes asignar rutinas a tus propios clientes',
      statusCode: 403,
    })

    expect(prisma.clienteRutina.create).not.toHaveBeenCalled()
  })

  it('un entrenador sí puede asignar a sus propios clientes', async () => {
    await rutinaService.asignarCliente(
      ID_RUTINA, GIMNASIO, { id_cliente: '10' } as never, ID_ENTRENADOR,
    )

    expect(prisma.clienteRutina.create).toHaveBeenCalled()
  })

  it('sin entrenador asignador (admin o recepción) no aplica esa restricción', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue({
      ...cliente,
      id_entrenador: 999n,
    } as never)

    await rutinaService.asignarCliente(ID_RUTINA, GIMNASIO, { id_cliente: '10' } as never)

    expect(prisma.clienteRutina.create).toHaveBeenCalled()
  })

  it('rechaza asignar a un cliente de otro gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue({
      ...cliente,
      id_gimnasio: OTRO_GIMNASIO,
    } as never)

    await expect(
      rutinaService.asignarCliente(ID_RUTINA, GIMNASIO, { id_cliente: '10' } as never),
    ).rejects.toMatchObject({ message: 'Cliente no encontrado', statusCode: 404 })
  })

  it('rechaza asignar a un cliente desactivado', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue({
      ...cliente,
      estado: false,
    } as never)

    await expect(
      rutinaService.asignarCliente(ID_RUTINA, GIMNASIO, { id_cliente: '10' } as never),
    ).rejects.toMatchObject({ message: 'Cliente inactivo', statusCode: 400 })
  })

  it('impide asignar dos veces la misma rutina al mismo cliente', async () => {
    vi.mocked(rutinaRepository.buscarAsignacionActiva).mockResolvedValue({ id: 1n } as never)

    await expect(
      rutinaService.asignarCliente(ID_RUTINA, GIMNASIO, { id_cliente: '10' } as never),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('normaliza la fecha de asignación al inicio del día', async () => {
    await rutinaService.asignarCliente(
      ID_RUTINA, GIMNASIO, { id_cliente: '10', fecha_asignacion: '2026-05-20' } as never,
    )

    const datos = vi.mocked(prisma.clienteRutina.create).mock.calls[0][0] as {
      data: { fecha_asignacion: Date }
    }
    expect(datos.data.fecha_asignacion.getHours()).toBe(0)
    expect(datos.data.fecha_asignacion.getMinutes()).toBe(0)
  })

  it('notifica al cliente su nueva rutina', async () => {
    await rutinaService.asignarCliente(ID_RUTINA, GIMNASIO, { id_cliente: '10' } as never)

    expect(notificationFactory.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Rutina asignada',
        mensaje: expect.stringContaining('Full Body Principiante'),
      }),
    )
  })
})

// ===========================================================================
describe('RF-13 · La rutina del cliente es una COPIA, no una referencia', () => {
  beforeEach(() => {
    vi.mocked(prisma.rutinaEjercicio.findMany).mockResolvedValue([
      {
        id_ejercicio: 1n,
        series: 3,
        repeticiones: 12,
        peso_sugerido: 20,
        ejercicio: { nombre: 'Sentadilla', grupo_muscular: 'Piernas' },
      },
      {
        id_ejercicio: 2n,
        series: 4,
        repeticiones: 10,
        peso_sugerido: 30,
        ejercicio: { nombre: 'Press banca', grupo_muscular: 'Pecho' },
      },
    ] as never)
  })

  it('copia nombre y grupo muscular al momento de asignar', async () => {
    await rutinaService.asignarCliente(ID_RUTINA, GIMNASIO, { id_cliente: '10' } as never)

    const argumento = vi.mocked(prisma.clienteRutinaEjercicio.createMany).mock.calls[0][0] as {
      data: Array<{ nombre: string; grupo_muscular: string; series: number; peso: number }>
    }

    // Si guardara solo el id del ejercicio, renombrar el ejercicio plantilla
    // cambiaría retroactivamente la rutina que el cliente ya venía siguiendo.
    expect(argumento.data[0]).toMatchObject({
      nombre: 'Sentadilla',
      grupo_muscular: 'Piernas',
      series: 3,
      peso: 20,
    })
    expect(argumento.data[1].nombre).toBe('Press banca')
  })

  it('numera los ejercicios en orden empezando en 1', async () => {
    await rutinaService.asignarCliente(ID_RUTINA, GIMNASIO, { id_cliente: '10' } as never)

    const argumento = vi.mocked(prisma.clienteRutinaEjercicio.createMany).mock.calls[0][0] as {
      data: Array<{ orden: number }>
    }
    expect(argumento.data.map((e) => e.orden)).toEqual([1, 2])
  })
})

// ===========================================================================
describe('Problema conocido: las transacciones no aíslan nada', () => {
  it('las escrituras usan el cliente global en vez del transaccional', async () => {
    await rutinaService.crear(GIMNASIO, 7n, dtoCrear as never)

    // PROBLEMA DETECTADO, no es el comportamiento deseado.
    //
    // El servicio abre prisma.$transaction(async (tx) => ...) pero adentro
    // llama a prisma.rutina.create y prisma.rutinaEjercicio.createMany en vez
    // de tx.rutina.create y tx.rutinaEjercicio.createMany.
    //
    // Consecuencia: esas escrituras NO forman parte de la transacción. Si
    // createMany falla, la rutina ya creada no se revierte y queda una rutina
    // huérfana sin ejercicios.
    //
    // Ocurre igual en actualizar(), eliminar() y asignarCliente(). En
    // asignarCliente es más grave: podría quedar una asignación sin sus
    // ejercicios copiados, o sea una rutina vacía para el cliente.
    //
    // Arreglo: reemplazar prisma.X por tx.X dentro de los callbacks.
    //
    // Esta prueba deja constancia del comportamiento actual. Cuando se
    // corrija, fallará a propósito para que se actualice junto con el arreglo.
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.rutina.create).toHaveBeenCalled()
  })
})
