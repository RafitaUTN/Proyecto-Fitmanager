/**
 * Pruebas unitarias de gimnasio.service
 *
 * Cubre RF-01 ("registrar nuevos gimnasios en la plataforma mediante un
 * formulario con los datos básicos del negocio y del usuario propietario"),
 * que es la primera historia del backlog y la puerta de entrada al sistema.
 *
 * El registro crea dos cosas a la vez: el gimnasio y su usuario
 * administrador. Si una fallara sin la otra quedaría un gimnasio sin nadie
 * que pueda entrar, o un usuario huérfano.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const RONDAS_MINIMAS_OWASP = 10

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(async () => '$2b$10$hashgenerado'), compare: vi.fn() },
}))

vi.mock('../repositories/gimnasio.repository', () => ({
  gimnasioRepository: {
    buscarPorCorreo: vi.fn(),
    crearConAdmin: vi.fn(),
  },
}))

import bcrypt from 'bcrypt'
import { gimnasioService } from './gimnasio.service'
import { gimnasioRepository } from '../repositories/gimnasio.repository'

const dtoRegistro = {
  nombre: 'PowerFit San Carlos',
  correo: 'contacto@powerfit.com',
  telefono: '24601234',
  direccion: 'Ciudad Quesada, Alajuela',
  usuario: {
    nombre: 'Wesman',
    apellido: 'Solera',
    correo: 'admin@powerfit.com',
    password: 'ClaveSegura123',
  },
}

const serializar = (valor: unknown) =>
  JSON.stringify(valor, (_clave, v) => (typeof v === 'bigint' ? v.toString() : v))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(gimnasioRepository.buscarPorCorreo).mockResolvedValue(null as never)
  vi.mocked(gimnasioRepository.crearConAdmin).mockResolvedValue({ id_gimnasio: 1n } as never)
})

// ===========================================================================
describe('RF-01 · Registro de gimnasio', () => {
  it('registra el gimnasio junto con su administrador', async () => {
    const resultado = await gimnasioService.registrar(dtoRegistro as never)

    expect(resultado).toEqual({ id_gimnasio: 1n })
    expect(gimnasioRepository.crearConAdmin).toHaveBeenCalledTimes(1)
  })

  it('separa los datos del negocio de los del usuario propietario', async () => {
    await gimnasioService.registrar(dtoRegistro as never)

    const datos = vi.mocked(gimnasioRepository.crearConAdmin).mock.calls[0][0] as {
      gimnasio: Record<string, unknown>
      admin: Record<string, unknown>
    }

    expect(datos.gimnasio).toEqual({
      nombre: 'PowerFit San Carlos',
      correo: 'contacto@powerfit.com',
      telefono: '24601234',
      direccion: 'Ciudad Quesada, Alajuela',
    })
    expect(datos.admin.correo).toBe('admin@powerfit.com')
  })

  it('rechaza un correo de gimnasio ya registrado', async () => {
    vi.mocked(gimnasioRepository.buscarPorCorreo).mockResolvedValue({
      id_gimnasio: 99n,
    } as never)

    await expect(gimnasioService.registrar(dtoRegistro as never)).rejects.toMatchObject({
      message: 'El correo del gimnasio ya está registrado',
      statusCode: 409,
    })

    expect(gimnasioRepository.crearConAdmin).not.toHaveBeenCalled()
  })

  it('valida el correo antes de gastar tiempo en el hash', async () => {
    vi.mocked(gimnasioRepository.buscarPorCorreo).mockResolvedValue({ id_gimnasio: 99n } as never)

    await gimnasioService.registrar(dtoRegistro as never).catch(() => undefined)

    // bcrypt con 10 rondas es deliberadamente lento; no tiene sentido
    // ejecutarlo para un registro que ya se sabe que va a fallar.
    expect(bcrypt.hash).not.toHaveBeenCalled()
  })
})

// ===========================================================================
describe('RNF-02 · La contraseña del administrador se hashea al registrar', () => {
  it('usa al menos las rondas que recomienda OWASP', async () => {
    await gimnasioService.registrar(dtoRegistro as never)

    const [claro, rondas] = vi.mocked(bcrypt.hash).mock.calls[0]
    expect(claro).toBe('ClaveSegura123')
    expect(rondas).toBeGreaterThanOrEqual(RONDAS_MINIMAS_OWASP)
  })

  it('nunca envía la contraseña en claro al repositorio', async () => {
    await gimnasioService.registrar(dtoRegistro as never)

    const datos = vi.mocked(gimnasioRepository.crearConAdmin).mock.calls[0][0] as {
      admin: Record<string, unknown>
    }

    expect(datos.admin.password).toBeUndefined()
    expect(datos.admin.password_hash).toBe('$2b$10$hashgenerado')
    expect(serializar(datos)).not.toContain('ClaveSegura123')
  })
})
