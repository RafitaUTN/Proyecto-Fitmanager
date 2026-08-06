/**
 * Pruebas unitarias de cliente-membresia.service
 *
 * Cubre RF-06 ("asignar, renovar y cancelar membresías a los clientes
 * registrados dentro de cada gimnasio") y RF-07 ("consultar el estado de una
 * membresía, indicando si se encuentra activa, vencida o próxima a vencer").
 *
 * Es el módulo con más aritmética de fechas del proyecto, y las fechas son
 * donde se esconden los errores caros: una renovación mal encadenada le
 * regala días al cliente o se los quita.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const GIMNASIO = 1n
const OTRO_GIMNASIO = 2n

// --- mock de la transacción -------------------------------------------------
// El servicio envuelve casi todo en prisma.$transaction(async (tx) => ...).
// Ejecutamos el callback de inmediato pasándole un tx falso.
const tx = {
  usuario: { findUnique: vi.fn() },
  cliente: { count: vi.fn(), update: vi.fn() },
  notificacion: { create: vi.fn() },
}

vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((cb: (t: unknown) => unknown) => cb(tx)),
    cliente: { findUnique: vi.fn() },
    clienteMembresia: { findMany: vi.fn() },
  },
}))

vi.mock('../repositories/cliente-membresia.repository', () => ({
  clienteMembresiaRepository: {
    buscarPorId: vi.fn(),
    listarActivaPorCliente: vi.fn(),
    listarPorCliente: vi.fn(),
    listarPorGimnasio: vi.fn(),
    listarRecientes: vi.fn(),
    crear: vi.fn(),
    actualizarEstado: vi.fn(),
  },
}))

vi.mock('../repositories/membresia.repository', () => ({
  membresiaRepository: { buscarPorId: vi.fn() },
}))

vi.mock('../repositories/cliente.repository', () => ({
  clienteRepository: { buscarPorId: vi.fn() },
}))

vi.mock('./notificacion.service', () => ({
  notificacionService: { crear: vi.fn() },
}))

import { clienteMembresiaService } from './cliente-membresia.service'
import { clienteMembresiaRepository } from '../repositories/cliente-membresia.repository'
import { membresiaRepository } from '../repositories/membresia.repository'
import { clienteRepository } from '../repositories/cliente.repository'

const cliente = {
  id_cliente: 10n,
  id_gimnasio: GIMNASIO,
  nombre: 'Sofia',
  apellido: 'Cruz',
  estado: true,
}

const planMensual = {
  id_membresia: 20n,
  id_gimnasio: GIMNASIO,
  nombre: 'Plan Mensual',
  duracion_dias: 30,
  precio: 25000,
  estado: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(cliente as never)
  vi.mocked(membresiaRepository.buscarPorId).mockResolvedValue(planMensual as never)
  vi.mocked(clienteMembresiaRepository.listarActivaPorCliente).mockResolvedValue(null as never)
  vi.mocked(clienteMembresiaRepository.crear).mockResolvedValue({ id_cliente_membresia: 30n } as never)
  vi.mocked(clienteMembresiaRepository.actualizarEstado).mockResolvedValue({} as never)
  tx.notificacion.create.mockResolvedValue({})
  tx.cliente.update.mockResolvedValue({})
})

// ===========================================================================
describe('RF-06 · Asignación de membresía', () => {
  it('calcula la fecha de fin sumando la duración del plan', async () => {
    await clienteMembresiaService.asignar(GIMNASIO, {
      id_cliente: '10',
      id_membresia: '20',
      fecha_inicio: '2026-03-01',
    } as never)

    const datos = vi.mocked(clienteMembresiaRepository.crear).mock.calls[0][0] as {
      fecha_inicio: Date
      fecha_fin: Date
      estado: string
    }

    const diasDeDiferencia =
      (datos.fecha_fin.getTime() - datos.fecha_inicio.getTime()) / 86400000
    expect(diasDeDiferencia).toBe(30)
    expect(datos.estado).toBe('activo')
  })

  it('cruza correctamente el cambio de mes al calcular el vencimiento', async () => {
    // 31 de enero + 30 días debe caer en marzo, no en un "31 de febrero".
    await clienteMembresiaService.asignar(GIMNASIO, {
      id_cliente: '10',
      id_membresia: '20',
      fecha_inicio: '2026-01-31',
    } as never)

    const datos = vi.mocked(clienteMembresiaRepository.crear).mock.calls[0][0] as {
      fecha_fin: Date
    }
    expect(datos.fecha_fin.getMonth()).toBe(2) // marzo (0-indexado)
    expect(datos.fecha_fin.getDate()).toBe(2)
  })

  it('impide asignar una segunda membresía si ya hay una activa', async () => {
    vi.mocked(clienteMembresiaRepository.listarActivaPorCliente).mockResolvedValue({
      id_cliente_membresia: 99n,
      estado: 'activo',
    } as never)

    await expect(
      clienteMembresiaService.asignar(GIMNASIO, {
        id_cliente: '10',
        id_membresia: '20',
        fecha_inicio: '2026-03-01',
      } as never),
    ).rejects.toMatchObject({
      message: 'El cliente ya tiene una membresía activa',
      statusCode: 400,
    })

    expect(clienteMembresiaRepository.crear).not.toHaveBeenCalled()
  })

  it('rechaza un plan desactivado', async () => {
    vi.mocked(membresiaRepository.buscarPorId).mockResolvedValue({
      ...planMensual,
      estado: false,
    } as never)

    await expect(
      clienteMembresiaService.asignar(GIMNASIO, {
        id_cliente: '10',
        id_membresia: '20',
        fecha_inicio: '2026-03-01',
      } as never),
    ).rejects.toMatchObject({ message: 'Membresía no válida', statusCode: 404 })
  })

  it('rechaza un plan que pertenece a otro gimnasio', async () => {
    vi.mocked(membresiaRepository.buscarPorId).mockResolvedValue({
      ...planMensual,
      id_gimnasio: OTRO_GIMNASIO,
    } as never)

    await expect(
      clienteMembresiaService.asignar(GIMNASIO, {
        id_cliente: '10',
        id_membresia: '20',
        fecha_inicio: '2026-03-01',
      } as never),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

// ===========================================================================
describe('RF-06 · Asignación con entrenador', () => {
  const entrenador = {
    id_usuario: 40n,
    id_gimnasio: GIMNASIO,
    rol: 'Entrenador',
    estado: true,
    capacidad_max: 15,
    nombre: 'Diego',
    apellido: 'Solano',
  }

  const dtoConEntrenador = {
    id_cliente: '10',
    id_membresia: '20',
    fecha_inicio: '2026-03-01',
    id_entrenador: '40',
  }

  it('asigna el entrenador cuando tiene cupo disponible', async () => {
    tx.usuario.findUnique.mockResolvedValue(entrenador)
    tx.cliente.count.mockResolvedValue(10) // 10 de 15

    await clienteMembresiaService.asignar(GIMNASIO, dtoConEntrenador as never)

    expect(tx.cliente.update).toHaveBeenCalledWith({
      where: { id_cliente: 10n },
      data: { id_entrenador: 40n },
    })
  })

  it('rechaza cuando el entrenador alcanzó su capacidad máxima', async () => {
    tx.usuario.findUnique.mockResolvedValue(entrenador)
    tx.cliente.count.mockResolvedValue(15) // justo en el tope

    await expect(
      clienteMembresiaService.asignar(GIMNASIO, dtoConEntrenador as never),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('el límite es inclusivo: con capacidad_max - 1 todavía acepta', async () => {
    tx.usuario.findUnique.mockResolvedValue(entrenador)
    tx.cliente.count.mockResolvedValue(14)

    await clienteMembresiaService.asignar(GIMNASIO, dtoConEntrenador as never)

    expect(clienteMembresiaRepository.crear).toHaveBeenCalled()
  })

  it('rechaza a un usuario que no tiene rol de Entrenador', async () => {
    tx.usuario.findUnique.mockResolvedValue({ ...entrenador, rol: 'Recepcionista' })

    await expect(
      clienteMembresiaService.asignar(GIMNASIO, dtoConEntrenador as never),
    ).rejects.toMatchObject({
      message: 'El entrenador no está disponible',
      statusCode: 400,
    })
  })

  it('rechaza a un entrenador desactivado', async () => {
    tx.usuario.findUnique.mockResolvedValue({ ...entrenador, estado: false })

    await expect(
      clienteMembresiaService.asignar(GIMNASIO, dtoConEntrenador as never),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rechaza a un entrenador de otro gimnasio', async () => {
    tx.usuario.findUnique.mockResolvedValue({ ...entrenador, id_gimnasio: OTRO_GIMNASIO })

    await expect(
      clienteMembresiaService.asignar(GIMNASIO, dtoConEntrenador as never),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('notifica al entrenador y a administración al asignar', async () => {
    tx.usuario.findUnique.mockResolvedValue(entrenador)
    tx.cliente.count.mockResolvedValue(5)

    await clienteMembresiaService.asignar(GIMNASIO, dtoConEntrenador as never)

    expect(tx.notificacion.create).toHaveBeenCalledTimes(2)
  })

  it('no notifica a nadie si la asignación va sin entrenador', async () => {
    await clienteMembresiaService.asignar(GIMNASIO, {
      id_cliente: '10',
      id_membresia: '20',
      fecha_inicio: '2026-03-01',
    } as never)

    expect(tx.notificacion.create).not.toHaveBeenCalled()
  })
})

// ===========================================================================
describe('RF-06 · Renovación', () => {
  const asignacionActiva = {
    id_cliente_membresia: 30n,
    id_cliente: 10n,
    id_membresia: 20n,
    estado: 'activo',
    fecha_inicio: new Date('2026-03-01'),
    fecha_fin: new Date('2026-03-31'),
  }

  it('encadena la renovación desde el vencimiento, sin traslapar días', async () => {
    vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue(asignacionActiva as never)
    vi.mocked(clienteMembresiaRepository.listarActivaPorCliente).mockResolvedValue(
      asignacionActiva as never,
    )

    await clienteMembresiaService.renovar(30n, GIMNASIO)

    const datos = vi.mocked(clienteMembresiaRepository.crear).mock.calls[0][0] as {
      fecha_inicio: Date
      fecha_fin: Date
    }

    // El periodo nuevo arranca donde termina el anterior. Si arrancara "hoy",
    // el cliente perdería los días que le quedaban.
    expect(datos.fecha_inicio).toEqual(asignacionActiva.fecha_fin)
    expect((datos.fecha_fin.getTime() - datos.fecha_inicio.getTime()) / 86400000).toBe(30)
  })

  it('no renueva una membresía cancelada', async () => {
    vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue({
      ...asignacionActiva,
      estado: 'cancelada',
    } as never)

    await expect(clienteMembresiaService.renovar(30n, GIMNASIO)).rejects.toMatchObject({
      message: 'Solo se puede renovar una membresía activa',
      statusCode: 400,
    })

    expect(clienteMembresiaRepository.crear).not.toHaveBeenCalled()
  })

  it('rechaza si el cliente tiene OTRA membresía activa distinta', async () => {
    vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue(asignacionActiva as never)
    vi.mocked(clienteMembresiaRepository.listarActivaPorCliente).mockResolvedValue({
      ...asignacionActiva,
      id_cliente_membresia: 99n,
    } as never)

    await expect(clienteMembresiaService.renovar(30n, GIMNASIO)).rejects.toMatchObject({
      message: 'El cliente ya tiene otra membresía activa',
      statusCode: 400,
    })
  })

  it('rechaza renovar una asignación inexistente', async () => {
    vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue(null as never)

    await expect(clienteMembresiaService.renovar(999n, GIMNASIO)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

// ===========================================================================
describe('RF-06 · Cancelación', () => {
  const asignacionActiva = {
    id_cliente_membresia: 30n,
    id_cliente: 10n,
    id_membresia: 20n,
    estado: 'activo',
    fecha_fin: new Date('2026-03-31'),
  }

  it('marca la asignación como cancelada', async () => {
    vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue(asignacionActiva as never)

    await clienteMembresiaService.cancelar(30n, GIMNASIO)

    expect(clienteMembresiaRepository.actualizarEstado).toHaveBeenCalledWith(
      30n,
      'cancelada',
      expect.anything(),
    )
  })

  it('no cancela dos veces la misma membresía', async () => {
    vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue({
      ...asignacionActiva,
      estado: 'cancelada',
    } as never)

    await expect(clienteMembresiaService.cancelar(30n, GIMNASIO)).rejects.toMatchObject({
      message: 'La membresía no está activa',
      statusCode: 400,
    })

    expect(clienteMembresiaRepository.actualizarEstado).not.toHaveBeenCalled()
  })

  it('bloquea la cancelación si el cliente es de otro gimnasio', async () => {
    vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue(asignacionActiva as never)
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue({
      ...cliente,
      id_gimnasio: OTRO_GIMNASIO,
    } as never)

    // NOTA: este endpoint responde 403, mientras que el resto del sistema
    // responde 404 ante accesos entre gimnasios. La protección funciona, pero
    // un 403 confirma que el recurso existe. Queda documentado aquí para
    // unificarlo con el criterio del resto (ver aislamiento-multitenant.test.ts).
    await expect(clienteMembresiaService.cancelar(30n, GIMNASIO)).rejects.toMatchObject({
      statusCode: 403,
    })

    expect(clienteMembresiaRepository.actualizarEstado).not.toHaveBeenCalled()
  })

  it('notifica la cancelación al gimnasio', async () => {
    vi.mocked(clienteMembresiaRepository.buscarPorId).mockResolvedValue(asignacionActiva as never)

    await clienteMembresiaService.cancelar(30n, GIMNASIO)

    expect(tx.notificacion.create).toHaveBeenCalledTimes(1)
  })
})

// ===========================================================================
describe('RF-06 · Cambio de plan', () => {
  it('cancela el plan vigente antes de crear el nuevo', async () => {
    vi.mocked(clienteMembresiaRepository.listarActivaPorCliente).mockResolvedValue({
      id_cliente_membresia: 30n,
      estado: 'activo',
    } as never)

    await clienteMembresiaService.cambiarPlan(10n, GIMNASIO, { id_membresia: 20n })

    // Sin esto el cliente quedaría con dos membresías activas a la vez.
    expect(clienteMembresiaRepository.actualizarEstado).toHaveBeenCalledWith(
      30n,
      'cancelada',
      expect.anything(),
    )
    expect(clienteMembresiaRepository.crear).toHaveBeenCalled()
  })

  it('funciona también si el cliente no tenía plan activo', async () => {
    await clienteMembresiaService.cambiarPlan(10n, GIMNASIO, { id_membresia: 20n })

    expect(clienteMembresiaRepository.actualizarEstado).not.toHaveBeenCalled()
    expect(clienteMembresiaRepository.crear).toHaveBeenCalled()
  })

  it('rechaza el cambio de plan a un cliente desactivado', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue({
      ...cliente,
      estado: false,
    } as never)

    await expect(
      clienteMembresiaService.cambiarPlan(10n, GIMNASIO, { id_membresia: 20n }),
    ).rejects.toMatchObject({ message: 'Cliente inactivo', statusCode: 400 })
  })
})
