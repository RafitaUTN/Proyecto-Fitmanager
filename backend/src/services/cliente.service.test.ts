/**
 * Pruebas unitarias de cliente.service
 *
 * Cubre RF-04 ("registrar, consultar, actualizar y desactivar clientes
 * asociados a un gimnasio específico").
 *
 * El caso interesante es el de un cliente que ya existe en OTRO gimnasio de
 * la plataforma. Como FitManager es multi-tenant sobre una sola base, la
 * cédula y el correo son únicos globalmente, así que el sistema tiene que
 * distinguir tres situaciones distintas:
 *
 *   1. Cédula duplicada en MI gimnasio        -> error simple 409
 *   2. Cédula existente en OTRO gimnasio      -> AppError con datos para
 *                                                ofrecer una transferencia
 *   3. Cédula libre                           -> se crea
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const MI_GIMNASIO = 1n
const OTRO_GIMNASIO = 2n

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
    buscarPorNombre: vi.fn(),
    listarPorGimnasio: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
  },
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
import { clienteRepository } from '../repositories/cliente.repository'
import { tokenService } from './token.service'
import { emailService } from '../email/email.service'
import { prisma } from '../lib/prisma'

const dtoNuevo = {
  nombre: 'Carlos',
  apellido: 'Vega',
  cedula: '112340567',
  correo: 'carlos@ejemplo.com',
  telefono: '88887777',
}

const clienteCreado = {
  id_cliente: 10n,
  id_gimnasio: MI_GIMNASIO,
  nombre: 'Carlos',
  apellido: 'Vega',
  cedula: '112340567',
  correo: 'carlos@ejemplo.com',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(clienteRepository.buscarPorCedula).mockResolvedValue(null as never)
  vi.mocked(clienteRepository.buscarPorCorreo).mockResolvedValue(null as never)
  vi.mocked(clienteRepository.crear).mockResolvedValue(clienteCreado as never)
  vi.mocked(tokenService.crearActivacion).mockResolvedValue('token-abc' as never)
  vi.mocked(emailService.sendPasswordSetupEmail).mockResolvedValue(undefined as never)
})

// ===========================================================================
describe('RF-04 · Creación de clientes', () => {
  it('crea el cliente y lo asocia al gimnasio del usuario autenticado', async () => {
    const resultado = await clienteService.crear(MI_GIMNASIO, dtoNuevo as never)

    expect(resultado).toEqual(clienteCreado)

    const datos = vi.mocked(clienteRepository.crear).mock.calls[0][0] as {
      id_gimnasio: bigint
    }
    expect(datos.id_gimnasio).toBe(MI_GIMNASIO)
  })

  it('rechaza una cédula ya registrada en el mismo gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorCedula).mockResolvedValue({
      ...clienteCreado,
      id_gimnasio: MI_GIMNASIO,
    } as never)

    await expect(clienteService.crear(MI_GIMNASIO, dtoNuevo as never)).rejects.toMatchObject({
      message: 'La cédula ya está registrada',
      statusCode: 409,
    })

    expect(clienteRepository.crear).not.toHaveBeenCalled()
  })

  it('distingue el caso de un cliente activo en OTRO gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorCedula).mockResolvedValue({
      ...clienteCreado,
      id_gimnasio: OTRO_GIMNASIO,
      estado: true,
    } as never)
    vi.mocked(prisma.gimnasio.findUnique).mockResolvedValue({
      nombre: 'PowerFit Alajuela',
    } as never)

    const error = await clienteService.crear(MI_GIMNASIO, dtoNuevo as never).catch((e) => e)

    // Código máquina propio, para que el frontend pueda ofrecer la
    // transferencia en vez de mostrar un 409 genérico.
    expect(error.codigo).toBe('CLIENTE_ACTIVO_OTRO_GYM')
    expect(error.statusCode).toBe(409)
    expect(error.data.gimnasio.nombre).toBe('PowerFit Alajuela')
    expect(error.data.cliente.cedula).toBe('112340567')
  })

  it('no filtra datos sensibles del cliente que está en otro gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorCedula).mockResolvedValue({
      ...clienteCreado,
      id_gimnasio: OTRO_GIMNASIO,
      estado: true,
      telefono: '60001111',
      fecha_nacimiento: new Date('1995-01-01'),
    } as never)
    vi.mocked(prisma.gimnasio.findUnique).mockResolvedValue({ nombre: 'Otro Gym' } as never)

    const error = await clienteService.crear(MI_GIMNASIO, dtoNuevo as never).catch((e) => e)

    // Solo lo mínimo para identificarlo; nada de teléfono ni fecha de nacimiento.
    expect(Object.keys(error.data.cliente).sort()).toEqual(
      ['apellido', 'cedula', 'id_cliente', 'nombre'].sort(),
    )
  })

  it('rechaza un correo ya registrado en el mismo gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorCorreo).mockResolvedValue({
      ...clienteCreado,
      id_gimnasio: MI_GIMNASIO,
    } as never)

    await expect(clienteService.crear(MI_GIMNASIO, dtoNuevo as never)).rejects.toMatchObject({
      message: 'El correo ya está registrado',
      statusCode: 409,
    })
  })

  it('también detecta por correo un cliente de otro gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorCorreo).mockResolvedValue({
      ...clienteCreado,
      id_gimnasio: OTRO_GIMNASIO,
      estado: true,
    } as never)
    vi.mocked(prisma.gimnasio.findUnique).mockResolvedValue({ nombre: 'Otro Gym' } as never)

    const error = await clienteService.crear(MI_GIMNASIO, dtoNuevo as never).catch((e) => e)
    expect(error.codigo).toBe('CLIENTE_ACTIVO_OTRO_GYM')
  })

  it('envía el correo de activación de contraseña al crear', async () => {
    await clienteService.crear(MI_GIMNASIO, dtoNuevo as never)

    expect(tokenService.crearActivacion).toHaveBeenCalledWith(10n)
    expect(emailService.sendPasswordSetupEmail).toHaveBeenCalledWith(
      { nombre: 'Carlos', correo: 'carlos@ejemplo.com' },
      'token-abc',
    )
  })

  it('NO revierte la creación si falla el envío del correo', async () => {
    vi.mocked(emailService.sendPasswordSetupEmail).mockRejectedValue(
      new Error('SMTP caído') as never,
    )
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    // Un SMTP caído no debe impedir dar de alta a un cliente en recepción.
    const resultado = await clienteService.crear(MI_GIMNASIO, dtoNuevo as never)

    expect(resultado).toEqual(clienteCreado)
    consola.mockRestore()
  })

  it('convierte la fecha de nacimiento a Date cuando viene informada', async () => {
    await clienteService.crear(MI_GIMNASIO, {
      ...dtoNuevo,
      fecha_nacimiento: '1995-06-15',
    } as never)

    const datos = vi.mocked(clienteRepository.crear).mock.calls[0][0] as {
      fecha_nacimiento?: Date
    }
    expect(datos.fecha_nacimiento).toBeInstanceOf(Date)
  })

  it('deja la fecha de nacimiento sin definir cuando no viene', async () => {
    await clienteService.crear(MI_GIMNASIO, dtoNuevo as never)

    const datos = vi.mocked(clienteRepository.crear).mock.calls[0][0] as {
      fecha_nacimiento?: Date
    }
    expect(datos.fecha_nacimiento).toBeUndefined()
  })
})

// ===========================================================================
describe('RF-04 · Búsqueda de clientes', () => {
  it('buscarPorCedula devuelve el cliente si es del gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorCedula).mockResolvedValue(clienteCreado as never)

    const resultado = await clienteService.buscarPorCedula('112340567', MI_GIMNASIO)
    expect(resultado).toEqual(clienteCreado)
  })

  it('buscarPorCedula devuelve null si el cliente es de otro gimnasio', async () => {
    vi.mocked(clienteRepository.buscarPorCedula).mockResolvedValue({
      ...clienteCreado,
      id_gimnasio: OTRO_GIMNASIO,
    } as never)

    const resultado = await clienteService.buscarPorCedula('112340567', MI_GIMNASIO)
    expect(resultado).toBeNull()
  })

  it('listar respeta el límite por defecto de 50', async () => {
    vi.mocked(clienteRepository.listarPorGimnasio).mockResolvedValue([] as never)

    await clienteService.listar(MI_GIMNASIO)

    expect(clienteRepository.listarPorGimnasio).toHaveBeenCalledWith(MI_GIMNASIO, 50)
  })
})
