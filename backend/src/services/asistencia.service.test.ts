/**
 * Pruebas unitarias de asistencia.service
 *
 * Cubre RF-11 ("registrar la asistencia de los clientes, validando si poseen
 * una membresía activa al momento del ingreso") y RF-12 (consulta del
 * historial de asistencia).
 *
 * La regla del RF-11 es la más delicada del módulo: si falla, entra al
 * gimnasio gente sin membresía vigente y el control de acceso deja de servir.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const GIMNASIO = 1n
const ID_CLIENTE = 100n

vi.mock('../repositories/asistencia.repository', () => ({
  asistenciaRepository: {
    listarPorGimnasio: vi.fn(),
    contarPorGimnasio: vi.fn(),
    buscarPorId: vi.fn(),
    buscarEntradaHoy: vi.fn(),
    crear: vi.fn(),
    actualizarSalida: vi.fn(),
  },
}))

vi.mock('../repositories/cliente.repository', () => ({
  clienteRepository: { buscarPorId: vi.fn() },
}))

vi.mock('../repositories/cliente-membresia.repository', () => ({
  clienteMembresiaRepository: { listarActivaPorCliente: vi.fn() },
}))

import { asistenciaService } from './asistencia.service'
import { asistenciaRepository } from '../repositories/asistencia.repository'
import { clienteRepository } from '../repositories/cliente.repository'
import { clienteMembresiaRepository } from '../repositories/cliente-membresia.repository'

const clienteActivo = {
  id_cliente: ID_CLIENTE,
  id_gimnasio: GIMNASIO,
  nombre: 'Luis',
  apellido: 'Mora',
  estado: true,
}

const membresiaActiva = { id_cliente_membresia: 400n, estado: 'activo' }

/** Deja el camino feliz preparado; cada test rompe solo la pieza que evalúa. */
function prepararCaminoFeliz() {
  vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(clienteActivo as never)
  vi.mocked(clienteMembresiaRepository.listarActivaPorCliente).mockResolvedValue(
    membresiaActiva as never,
  )
  vi.mocked(asistenciaRepository.buscarEntradaHoy).mockResolvedValue(null as never)
  vi.mocked(asistenciaRepository.crear).mockResolvedValue({ id_asistencia: 500n } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
describe('RF-11 · Registro de entrada', () => {
  it('registra la entrada cuando el cliente está activo y tiene membresía vigente', async () => {
    prepararCaminoFeliz()

    const resultado = await asistenciaService.registrarEntrada(GIMNASIO, {
      id_cliente: '100',
    } as never)

    expect(resultado).toEqual({ id_asistencia: 500n })
    expect(asistenciaRepository.crear).toHaveBeenCalledTimes(1)
  })

  it('RECHAZA la entrada si el cliente no tiene membresía activa', async () => {
    prepararCaminoFeliz()
    vi.mocked(clienteMembresiaRepository.listarActivaPorCliente).mockResolvedValue(null as never)

    await expect(
      asistenciaService.registrarEntrada(GIMNASIO, { id_cliente: '100' } as never),
    ).rejects.toMatchObject({
      message: 'El cliente no tiene una membresía activa',
      statusCode: 400,
    })

    // Lo importante no es el mensaje, sino que NO se registró el ingreso.
    expect(asistenciaRepository.crear).not.toHaveBeenCalled()
  })

  it('rechaza la entrada de un cliente desactivado aunque tenga membresía', async () => {
    prepararCaminoFeliz()
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue({
      ...clienteActivo,
      estado: false,
    } as never)

    await expect(
      asistenciaService.registrarEntrada(GIMNASIO, { id_cliente: '100' } as never),
    ).rejects.toMatchObject({ message: 'Cliente inactivo', statusCode: 400 })

    expect(asistenciaRepository.crear).not.toHaveBeenCalled()
  })

  it('valida el estado del cliente ANTES de consultar la membresía', async () => {
    prepararCaminoFeliz()
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue({
      ...clienteActivo,
      estado: false,
    } as never)

    await asistenciaService
      .registrarEntrada(GIMNASIO, { id_cliente: '100' } as never)
      .catch(() => undefined)

    // Evita una consulta innecesaria a la BD en un caso que ya se sabe inválido.
    expect(clienteMembresiaRepository.listarActivaPorCliente).not.toHaveBeenCalled()
  })

  it('rechaza si el cliente no existe', async () => {
    prepararCaminoFeliz()
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(null as never)

    await expect(
      asistenciaService.registrarEntrada(GIMNASIO, { id_cliente: '999' } as never),
    ).rejects.toMatchObject({ message: 'Cliente no encontrado', statusCode: 404 })
  })

  it('impide una segunda entrada si la anterior no tiene salida', async () => {
    prepararCaminoFeliz()
    vi.mocked(asistenciaRepository.buscarEntradaHoy).mockResolvedValue({
      id_asistencia: 500n,
      fecha_hora_salida: null,
    } as never)

    await expect(
      asistenciaService.registrarEntrada(GIMNASIO, { id_cliente: '100' } as never),
    ).rejects.toMatchObject({
      message: 'El cliente ya tiene una entrada registrada sin salida',
      statusCode: 409,
    })

    expect(asistenciaRepository.crear).not.toHaveBeenCalled()
  })

  it('convierte el id_cliente de string a BigInt antes de consultar', async () => {
    prepararCaminoFeliz()

    await asistenciaService.registrarEntrada(GIMNASIO, { id_cliente: '100' } as never)

    // El DTO llega como string desde HTTP; Prisma exige BigInt.
    expect(clienteRepository.buscarPorId).toHaveBeenCalledWith(100n)
  })
})

// ===========================================================================
describe('Registro de salida', () => {
  it('registra la salida de una entrada abierta', async () => {
    vi.mocked(asistenciaRepository.buscarPorId).mockResolvedValue({
      id_asistencia: 500n,
      fecha_hora_salida: null,
      cliente: clienteActivo,
    } as never)
    vi.mocked(asistenciaRepository.actualizarSalida).mockResolvedValue({} as never)

    await asistenciaService.registrarSalida(GIMNASIO, { id_asistencia: '500' } as never)

    expect(asistenciaRepository.actualizarSalida).toHaveBeenCalledTimes(1)
    const [id, fecha] = vi.mocked(asistenciaRepository.actualizarSalida).mock.calls[0]
    expect(id).toBe(500n)
    expect(fecha).toBeInstanceOf(Date)
  })

  it('impide registrar dos veces la salida de la misma entrada', async () => {
    vi.mocked(asistenciaRepository.buscarPorId).mockResolvedValue({
      id_asistencia: 500n,
      fecha_hora_salida: new Date('2026-08-06T18:00:00Z'),
      cliente: clienteActivo,
    } as never)

    await expect(
      asistenciaService.registrarSalida(GIMNASIO, { id_asistencia: '500' } as never),
    ).rejects.toMatchObject({
      message: 'Esta entrada ya tiene una salida registrada',
      statusCode: 409,
    })

    expect(asistenciaRepository.actualizarSalida).not.toHaveBeenCalled()
  })

  it('rechaza si la asistencia no existe', async () => {
    vi.mocked(asistenciaRepository.buscarPorId).mockResolvedValue(null as never)

    await expect(
      asistenciaService.registrarSalida(GIMNASIO, { id_asistencia: '999' } as never),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

// ===========================================================================
describe('RF-12 · Consulta del historial de asistencia', () => {
  beforeEach(() => {
    vi.mocked(asistenciaRepository.listarPorGimnasio).mockResolvedValue([] as never)
    vi.mocked(asistenciaRepository.contarPorGimnasio).mockResolvedValue(0 as never)
  })

  it('normaliza el rango de fechas para cubrir los días completos', async () => {
    await asistenciaService.listar(
      GIMNASIO,
      { fecha_inicio: '2026-08-01', fecha_fin: '2026-08-31', pagina: 1, limite: 20 } as never,
    )

    const filtros = vi.mocked(asistenciaRepository.listarPorGimnasio).mock.calls[0][1] as {
      fecha_inicio: Date
      fecha_fin: Date
    }

    // Sin esto, una asistencia de las 3pm del último día quedaría fuera del filtro.
    expect(filtros.fecha_inicio.getHours()).toBe(0)
    expect(filtros.fecha_inicio.getMinutes()).toBe(0)
    expect(filtros.fecha_fin.getHours()).toBe(23)
    expect(filtros.fecha_fin.getMinutes()).toBe(59)
  })

  it('calcula correctamente el total de páginas', async () => {
    vi.mocked(asistenciaRepository.contarPorGimnasio).mockResolvedValue(45 as never)

    const resultado = await asistenciaService.listar(
      GIMNASIO,
      { pagina: 1, limite: 20 } as never,
    )

    // 45 registros de 20 en 20 son 3 páginas, no 2.
    expect(resultado.total).toBe(45)
    expect(resultado.totalPaginas).toBe(3)
  })

  it('devuelve 0 páginas cuando no hay registros', async () => {
    const resultado = await asistenciaService.listar(
      GIMNASIO,
      { pagina: 1, limite: 20 } as never,
    )

    expect(resultado.totalPaginas).toBe(0)
  })

  it('siempre consulta acotado al gimnasio recibido', async () => {
    await asistenciaService.listar(GIMNASIO, { pagina: 1, limite: 20 } as never)

    expect(asistenciaRepository.listarPorGimnasio).toHaveBeenCalledWith(
      GIMNASIO,
      expect.anything(),
      1,
      20,
    )
  })
})
