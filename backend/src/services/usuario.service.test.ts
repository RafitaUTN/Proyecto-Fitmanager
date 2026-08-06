/**
 * Pruebas unitarias de usuario.service
 *
 * Cubre RF-03 ("gestión de usuarios internos dentro de cada gimnasio,
 * incluyendo registro, consulta, actualización, desactivación y asignación de
 * roles") y aporta la verificación del RNF-02.
 *
 * RNF-02 (Seguridad): "Las contraseñas de los usuarios deberán almacenarse
 * mediante un algoritmo de hashing seguro, como bcrypt, con un mínimo de 10
 * rondas de cifrado, siguiendo las recomendaciones de OWASP."
 *
 * Ese RNF es medible, así que aquí se mide: se comprueba el factor de coste
 * que recibe bcrypt y que la contraseña en claro jamás llegue al repositorio.
 *
 * Se cubre además la regla que impide que un gimnasio se quede sin ningún
 * administrador activo, que dejaría la cuenta inoperable sin forma de
 * recuperarla desde la interfaz.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const GIMNASIO = 1n
const OTRO_GIMNASIO = 2n
const RONDAS_MINIMAS_OWASP = 10

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(async () => '$2b$10$hashgenerado'), compare: vi.fn() },
}))

vi.mock('../lib/prisma', () => ({
  prisma: { usuario: { count: vi.fn() } },
}))

vi.mock('../repositories/usuario.repository', () => ({
  usuarioRepository: {
    listarPorGimnasio: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorCorreo: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  },
}))

import bcrypt from 'bcrypt'
import { usuarioService } from './usuario.service'
import { usuarioRepository } from '../repositories/usuario.repository'
import { prisma } from '../lib/prisma'

const recepcionista = {
  id_usuario: 7n,
  id_gimnasio: GIMNASIO,
  nombre: 'Marta',
  apellido: 'Leiva',
  correo: 'marta@powerfit.com',
  rol: 'Recepcionista',
  estado: true,
}

const admin = { ...recepcionista, id_usuario: 5n, rol: 'Administrador' }

const dtoNuevo = {
  nombre: 'Nuevo',
  apellido: 'Usuario',
  correo: 'nuevo@powerfit.com',
  password: 'ClaveSegura123',
  rol: 'Recepcionista',
}

/**
 * JSON.stringify no sabe serializar BigInt y los IDs del modelo lo son
 * (id_gimnasio). Convertimos a string para poder revisar el objeto completo
 * en busca de la contraseña en claro.
 */
const serializar = (valor: unknown) =>
  JSON.stringify(valor, (_clave, v) => (typeof v === 'bigint' ? v.toString() : v))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue(null as never)
  vi.mocked(usuarioRepository.crear).mockResolvedValue({ id_usuario: 8n } as never)
  vi.mocked(usuarioRepository.actualizar).mockResolvedValue({} as never)
  vi.mocked(usuarioRepository.buscarPorId).mockResolvedValue(recepcionista as never)
  vi.mocked(prisma.usuario.count).mockResolvedValue(3 as never)
})

// ===========================================================================
describe('RNF-02 · Almacenamiento seguro de contraseñas', () => {
  it('hashea con al menos las rondas que recomienda OWASP', async () => {
    await usuarioService.crear(GIMNASIO, dtoNuevo as never)

    const [, rondas] = vi.mocked(bcrypt.hash).mock.calls[0]
    expect(rondas).toBeGreaterThanOrEqual(RONDAS_MINIMAS_OWASP)
  })

  it('hashea la contraseña recibida, no otra cosa', async () => {
    await usuarioService.crear(GIMNASIO, dtoNuevo as never)

    const [claro] = vi.mocked(bcrypt.hash).mock.calls[0]
    expect(claro).toBe('ClaveSegura123')
  })

  it('NUNCA envía la contraseña en claro al repositorio', async () => {
    await usuarioService.crear(GIMNASIO, dtoNuevo as never)

    const datos = vi.mocked(usuarioRepository.crear).mock.calls[0][0] as Record<string, unknown>

    expect(datos.password).toBeUndefined()
    expect(datos.password_hash).toBe('$2b$10$hashgenerado')
    expect(serializar(datos)).not.toContain('ClaveSegura123')
  })

  it('también hashea al cambiar la contraseña en una actualización', async () => {
    await usuarioService.actualizar(7n, { password: 'OtraClave456' } as never, GIMNASIO)

    const [claro, rondas] = vi.mocked(bcrypt.hash).mock.calls[0]
    expect(claro).toBe('OtraClave456')
    expect(rondas).toBeGreaterThanOrEqual(RONDAS_MINIMAS_OWASP)

    const datos = vi.mocked(usuarioRepository.actualizar).mock.calls[0][1] as Record<string, unknown>
    expect(datos.password).toBeUndefined()
  })

  it('no invoca bcrypt si la actualización no trae contraseña', async () => {
    await usuarioService.actualizar(7n, { nombre: 'Marta Elena' } as never, GIMNASIO)

    expect(bcrypt.hash).not.toHaveBeenCalled()
  })
})

// ===========================================================================
describe('RF-03 · Creación de usuarios internos', () => {
  it('asocia el usuario al gimnasio del token', async () => {
    await usuarioService.crear(GIMNASIO, dtoNuevo as never)

    const datos = vi.mocked(usuarioRepository.crear).mock.calls[0][0] as { id_gimnasio: bigint }
    expect(datos.id_gimnasio).toBe(GIMNASIO)
  })

  it('rechaza un correo ya registrado', async () => {
    vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue(recepcionista as never)

    await expect(usuarioService.crear(GIMNASIO, dtoNuevo as never)).rejects.toMatchObject({
      message: 'El correo ya está registrado',
      statusCode: 409,
    })

    expect(usuarioRepository.crear).not.toHaveBeenCalled()
  })
})

// ===========================================================================
describe('RF-03 · Actualización y aislamiento', () => {
  it('no permite modificar un usuario de otro gimnasio', async () => {
    vi.mocked(usuarioRepository.buscarPorId).mockResolvedValue({
      ...recepcionista,
      id_gimnasio: OTRO_GIMNASIO,
    } as never)

    await expect(
      usuarioService.actualizar(7n, { nombre: 'Hackeado' } as never, GIMNASIO),
    ).rejects.toMatchObject({ message: 'Usuario no encontrado', statusCode: 404 })

    expect(usuarioRepository.actualizar).not.toHaveBeenCalled()
  })

  it('impide que un usuario se desactive a sí mismo', async () => {
    // Evita que alguien se deje fuera del sistema por accidente.
    await expect(
      usuarioService.actualizar(7n, { estado: false } as never, GIMNASIO, 7n),
    ).rejects.toMatchObject({
      message: 'No puedes desactivarte a ti mismo',
      statusCode: 400,
    })
  })

  it('sí permite desactivar a otro usuario', async () => {
    await usuarioService.actualizar(7n, { estado: false } as never, GIMNASIO, 99n)

    expect(usuarioRepository.actualizar).toHaveBeenCalled()
  })

  it('rechaza cambiar el correo a uno ya usado', async () => {
    vi.mocked(usuarioRepository.buscarPorCorreo).mockResolvedValue(admin as never)

    await expect(
      usuarioService.actualizar(7n, { correo: 'admin@powerfit.com' } as never, GIMNASIO),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('permite guardar sin cambiar el correo', async () => {
    // El correo llega igual al que ya tiene: no debe tratarse como duplicado.
    await usuarioService.actualizar(
      7n,
      { correo: 'marta@powerfit.com', nombre: 'Marta E.' } as never,
      GIMNASIO,
    )

    expect(usuarioRepository.buscarPorCorreo).not.toHaveBeenCalled()
    expect(usuarioRepository.actualizar).toHaveBeenCalled()
  })
})

// ===========================================================================
describe('RF-03 · El gimnasio no puede quedarse sin administrador', () => {
  beforeEach(() => {
    vi.mocked(usuarioRepository.buscarPorId).mockResolvedValue(admin as never)
  })

  it('impide desactivar al último administrador activo', async () => {
    vi.mocked(prisma.usuario.count).mockResolvedValue(1 as never)

    await expect(
      usuarioService.actualizar(5n, { estado: false } as never, GIMNASIO, 99n),
    ).rejects.toMatchObject({
      message: 'Debe haber al menos un administrador activo en el gimnasio',
      statusCode: 400,
    })

    expect(usuarioRepository.actualizar).not.toHaveBeenCalled()
  })

  it('impide degradar de rol al último administrador', async () => {
    vi.mocked(prisma.usuario.count).mockResolvedValue(1 as never)

    // Dejar el gimnasio sin ningún admin lo vuelve inoperable: nadie podría
    // volver a crear usuarios ni recuperar el acceso desde la interfaz.
    await expect(
      usuarioService.actualizar(5n, { rol: 'Recepcionista' } as never, GIMNASIO, 99n),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('sí permite desactivar un administrador si quedan otros', async () => {
    vi.mocked(prisma.usuario.count).mockResolvedValue(2 as never)

    await usuarioService.actualizar(5n, { estado: false } as never, GIMNASIO, 99n)

    expect(usuarioRepository.actualizar).toHaveBeenCalled()
  })

  it('sí permite degradar un administrador si quedan otros', async () => {
    vi.mocked(prisma.usuario.count).mockResolvedValue(3 as never)

    await usuarioService.actualizar(5n, { rol: 'Entrenador' } as never, GIMNASIO, 99n)

    expect(usuarioRepository.actualizar).toHaveBeenCalled()
  })

  it('no cuenta administradores al editar a un no-administrador', async () => {
    vi.mocked(usuarioRepository.buscarPorId).mockResolvedValue(recepcionista as never)

    await usuarioService.actualizar(7n, { nombre: 'Marta E.' } as never, GIMNASIO)

    // Consulta innecesaria a la BD si el usuario no tiene nada que ver con el rol.
    expect(prisma.usuario.count).not.toHaveBeenCalled()
  })

  it('cuenta administradores solo dentro del gimnasio correspondiente', async () => {
    vi.mocked(prisma.usuario.count).mockResolvedValue(2 as never)

    await usuarioService.actualizar(5n, { estado: false } as never, GIMNASIO, 99n)

    expect(prisma.usuario.count).toHaveBeenCalledWith({
      where: { id_gimnasio: GIMNASIO, rol: 'Administrador', estado: true },
    })
  })
})

// ===========================================================================
describe('RF-03 · Eliminación', () => {
  it('impide que un usuario se elimine a sí mismo', async () => {
    await expect(usuarioService.eliminar(7n, GIMNASIO, 7n)).rejects.toMatchObject({
      message: 'No puedes eliminarte a ti mismo',
      statusCode: 400,
    })
  })

  it('no permite eliminar un usuario de otro gimnasio', async () => {
    vi.mocked(usuarioRepository.buscarPorId).mockResolvedValue({
      ...recepcionista,
      id_gimnasio: OTRO_GIMNASIO,
    } as never)

    await expect(usuarioService.eliminar(7n, GIMNASIO, 99n)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
