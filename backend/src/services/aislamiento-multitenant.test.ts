/**
 * Pruebas de aislamiento multi-tenant (RNF-12 / HU-18).
 *
 * El documento del proyecto exige: "El sistema deberá garantizar que la
 * información de cada gimnasio se mantenga aislada a nivel lógico, evitando
 * que usuarios de un gimnasio puedan consultar, modificar o eliminar datos
 * pertenecientes a otra organización. Esta condición se verificará mediante
 * pruebas de acceso entre organizaciones registradas."
 *
 * Estas pruebas son esa verificación.
 *
 * Escenario base para todas: existen dos gimnasios registrados en la
 * plataforma. Un usuario autenticado del GIMNASIO_A intenta operar sobre
 * recursos que pertenecen al GIMNASIO_B.
 *
 * Criterio: el sistema debe responder 404 (no 403), para no revelar siquiera
 * que el recurso existe en otra organización. Eso evita que un atacante pueda
 * enumerar IDs válidos de otros gimnasios.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const GIMNASIO_A = 1n
const GIMNASIO_B = 2n

// ---------------------------------------------------------------------------
// Mocks: aislamos los servicios de la base de datos real.
// ---------------------------------------------------------------------------

vi.mock('../lib/prisma', () => ({
  prisma: {
    gimnasio: { findUnique: vi.fn() },
    usuario: { findUnique: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
    pago: { deleteMany: vi.fn() },
    clienteMembresia: { deleteMany: vi.fn() },
    asistencia: { deleteMany: vi.fn() },
    clienteRutina: { deleteMany: vi.fn() },
    notificacion: { deleteMany: vi.fn() },
    solicitudTransferencia: { deleteMany: vi.fn() },
    cliente: { delete: vi.fn() },
  },
}))

vi.mock('../repositories/cliente.repository', () => ({
  clienteRepository: {
    buscarPorId: vi.fn(),
    buscarPorCedula: vi.fn(),
    buscarPorCorreo: vi.fn(),
    listarPorGimnasio: vi.fn(),
    actualizar: vi.fn(),
    crear: vi.fn(),
  },
}))

vi.mock('../repositories/membresia.repository', () => ({
  membresiaRepository: {
    buscarPorId: vi.fn(),
    listarPorGimnasio: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    crear: vi.fn(),
  },
}))

vi.mock('../repositories/asistencia.repository', () => ({
  asistenciaRepository: {
    buscarPorId: vi.fn(),
    buscarEntradaHoy: vi.fn(),
    crear: vi.fn(),
    actualizarSalida: vi.fn(),
  },
}))

vi.mock('../repositories/cliente-membresia.repository', () => ({
  clienteMembresiaRepository: { listarActivaPorCliente: vi.fn() },
}))

vi.mock('./notification-factory.service', () => ({
  notificationFactory: { crearMultiple: vi.fn() },
}))

vi.mock('./token.service', () => ({
  tokenService: { crearActivacion: vi.fn() },
}))

vi.mock('../email/email.service', () => ({
  emailService: { sendPasswordSetupEmail: vi.fn() },
}))

import { clienteService } from './cliente.service'
import { membresiaService } from './membresia.service'
import { asistenciaService } from './asistencia.service'
import { clienteRepository } from '../repositories/cliente.repository'
import { membresiaRepository } from '../repositories/membresia.repository'
import { asistenciaRepository } from '../repositories/asistencia.repository'
import { clienteMembresiaRepository } from '../repositories/cliente-membresia.repository'

/** Cliente que pertenece al GIMNASIO_B. */
const clienteDelGimnasioB = {
  id_cliente: 100n,
  id_gimnasio: GIMNASIO_B,
  id_entrenador: null,
  nombre: 'Ana',
  apellido: 'Rojas',
  cedula: '206780123',
  correo: 'ana@ejemplo.com',
  estado: true,
}

/** Membresía que pertenece al GIMNASIO_B. */
const membresiaDelGimnasioB = {
  id_membresia: 200n,
  id_gimnasio: GIMNASIO_B,
  nombre: 'Plan Mensual',
  precio: 25000,
  duracion_dias: 30,
  estado: true,
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
describe('RNF-12 · Aislamiento de clientes entre gimnasios', () => {
  it('no permite consultar un cliente de otro gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(clienteDelGimnasioB as never)

    await expect(clienteService.buscar(100n, GIMNASIO_A)).rejects.toMatchObject({
      message: 'Cliente no encontrado',
      statusCode: 404,
    })
  })

  it('sí permite consultar un cliente propio (control positivo)', async () => {
    const clientePropio = { ...clienteDelGimnasioB, id_gimnasio: GIMNASIO_A }
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(clientePropio as never)

    const resultado = await clienteService.buscar(100n, GIMNASIO_A)
    expect(resultado.id_gimnasio).toBe(GIMNASIO_A)
  })

  it('no permite modificar un cliente de otro gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(clienteDelGimnasioB as never)

    await expect(
      clienteService.actualizar(100n, { nombre: 'Intruso' } as never, GIMNASIO_A, 1n),
    ).rejects.toMatchObject({ statusCode: 404 })

    // Lo esencial: la escritura nunca llegó al repositorio.
    expect(clienteRepository.actualizar).not.toHaveBeenCalled()
  })

  it('no permite eliminar un cliente de otro gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(clienteDelGimnasioB as never)

    await expect(clienteService.eliminar(100n, GIMNASIO_A)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('buscarPorCedula no filtra clientes de otro gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorCedula).mockResolvedValue(clienteDelGimnasioB as never)

    const resultado = await clienteService.buscarPorCedula('206780123', GIMNASIO_A)
    expect(resultado).toBeNull()
  })

  it('devuelve 404 y no 403, para no revelar que el recurso existe', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(clienteDelGimnasioB as never)

    // Un cliente inexistente y uno de otro gimnasio deben ser indistinguibles.
    const errorAjeno = await clienteService.buscar(100n, GIMNASIO_A).catch((e) => e)

    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(null as never)
    const errorInexistente = await clienteService.buscar(999n, GIMNASIO_A).catch((e) => e)

    expect(errorAjeno.message).toBe(errorInexistente.message)
    expect(errorAjeno.statusCode).toBe(errorInexistente.statusCode)
  })
})

// ===========================================================================
describe('RNF-12 · Aislamiento de membresías entre gimnasios', () => {
  it('no permite consultar una membresía de otro gimnasio', async () => {
    vi.mocked(membresiaRepository.buscarPorId).mockResolvedValue(membresiaDelGimnasioB as never)

    await expect(membresiaService.buscar(200n, GIMNASIO_A)).rejects.toMatchObject({
      message: 'Membresía no encontrada',
      statusCode: 404,
    })
  })

  it('sí permite consultar una membresía propia (control positivo)', async () => {
    const propia = { ...membresiaDelGimnasioB, id_gimnasio: GIMNASIO_A }
    vi.mocked(membresiaRepository.buscarPorId).mockResolvedValue(propia as never)

    const resultado = await membresiaService.buscar(200n, GIMNASIO_A)
    expect(resultado.id_gimnasio).toBe(GIMNASIO_A)
  })

  it('no permite modificar el precio de una membresía de otro gimnasio', async () => {
    vi.mocked(membresiaRepository.buscarPorId).mockResolvedValue(membresiaDelGimnasioB as never)

    await expect(
      membresiaService.actualizar(200n, { precio: 1 } as never, GIMNASIO_A),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(membresiaRepository.actualizar).not.toHaveBeenCalled()
  })

  it('no permite eliminar una membresía de otro gimnasio', async () => {
    vi.mocked(membresiaRepository.buscarPorId).mockResolvedValue(membresiaDelGimnasioB as never)

    await expect(membresiaService.eliminar(200n, GIMNASIO_A)).rejects.toMatchObject({
      statusCode: 404,
    })

    expect(membresiaRepository.eliminar).not.toHaveBeenCalled()
  })

  it('al crear, fuerza el gimnasio del token e ignora el del payload', async () => {
    vi.mocked(membresiaRepository.crear).mockResolvedValue({} as never)

    // Un atacante podría intentar inyectar id_gimnasio en el cuerpo del request.
    await membresiaService.crear(GIMNASIO_A, {
      nombre: 'Plan',
      precio: 100,
      duracion_dias: 30,
      id_gimnasio: GIMNASIO_B,
    } as never)

    const argumento = vi.mocked(membresiaRepository.crear).mock.calls[0][0] as {
      id_gimnasio: bigint
    }
    expect(argumento.id_gimnasio).toBe(GIMNASIO_A)
  })
})

// ===========================================================================
describe('RNF-12 · Aislamiento de asistencias entre gimnasios', () => {
  it('no permite registrar la entrada de un cliente de otro gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(clienteDelGimnasioB as never)

    await expect(
      asistenciaService.registrarEntrada(GIMNASIO_A, { id_cliente: '100' } as never),
    ).rejects.toMatchObject({ message: 'Cliente no encontrado', statusCode: 404 })

    expect(asistenciaRepository.crear).not.toHaveBeenCalled()
  })

  it('no permite registrar la salida de una asistencia de otro gimnasio', async () => {
    vi.mocked(asistenciaRepository.buscarPorId).mockResolvedValue({
      id_asistencia: 300n,
      fecha_hora_salida: null,
      cliente: clienteDelGimnasioB,
    } as never)

    await expect(
      asistenciaService.registrarSalida(GIMNASIO_A, { id_asistencia: '300' } as never),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(asistenciaRepository.actualizarSalida).not.toHaveBeenCalled()
  })

  it('sí permite registrar entrada de un cliente propio con membresía activa (control positivo)', async () => {
    const clientePropio = { ...clienteDelGimnasioB, id_gimnasio: GIMNASIO_A }
    vi.mocked(clienteRepository.buscarPorId).mockResolvedValue(clientePropio as never)
    vi.mocked(clienteMembresiaRepository.listarActivaPorCliente).mockResolvedValue({
      id_cliente_membresia: 400n,
      estado: 'activo',
    } as never)
    vi.mocked(asistenciaRepository.buscarEntradaHoy).mockResolvedValue(null as never)
    vi.mocked(asistenciaRepository.crear).mockResolvedValue({ id_asistencia: 500n } as never)

    await asistenciaService.registrarEntrada(GIMNASIO_A, { id_cliente: '100' } as never)

    expect(asistenciaRepository.crear).toHaveBeenCalled()
  })
})
