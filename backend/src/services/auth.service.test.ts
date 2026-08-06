/**
 * Pruebas unitarias de auth.service
 *
 * Cubre RF-02 ("permitir el inicio y cierre de sesión de usuarios autorizados
 * mediante correo electrónico y contraseña") y aporta evidencia para el
 * RNF-04 (control de acceso).
 *
 * Aquí lo que se prueba no es solo que el login funcione, sino que falle
 * bien. Un sistema de autenticación que responde distinto ante "el correo no
 * existe" y "la contraseña es incorrecta" le permite a un atacante enumerar
 * qué correos están registrados en la plataforma.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

vi.mock('bcrypt', () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}))

vi.mock('../lib/prisma', () => ({
  prisma: { gimnasio: { findUnique: vi.fn() } },
}))

vi.mock('../repositories/auth.repository', () => ({
  authRepository: {
    limpiarExpirados: vi.fn(),
    buscarPorCorreo: vi.fn(),
    guardarRefreshToken: vi.fn(),
    buscarRefreshToken: vi.fn(),
    eliminarRefreshToken: vi.fn(),
  },
}))

vi.mock('../lib/jwt', () => ({
  firmarToken: vi.fn(() => 'jwt-de-acceso'),
  firmarRefreshToken: vi.fn(() => 'jwt-de-refresco'),
  verificarRefreshToken: vi.fn(),
}))

import bcrypt from 'bcrypt'
import { authService } from './auth.service'
import { authRepository } from '../repositories/auth.repository'
import { verificarRefreshToken } from '../lib/jwt'
import { prisma } from '../lib/prisma'

const usuarioActivo = {
  id_usuario: 5n,
  id_gimnasio: 1n,
  nombre: 'Wesman',
  apellido: 'Solera',
  correo: 'admin@powerfit.com',
  rol: 'Administrador',
  estado: true,
  password_hash: '$2b$10$hashfalsoparapruebas',
}

const sha256 = (valor: string) => crypto.createHash('sha256').update(valor).digest('hex')

/**
 * JSON.stringify no sabe serializar BigInt y los IDs del modelo lo son
 * (id_usuario, id_gimnasio). Convertimos a string para poder inspeccionar
 * la respuesta completa en busca de datos que no deberían estar ahí.
 */
const serializar = (valor: unknown) =>
  JSON.stringify(valor, (_clave, v) => (typeof v === 'bigint' ? v.toString() : v))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(authRepository.limpiarExpirados).mockResolvedValue(undefined as never)
  vi.mocked(authRepository.buscarPorCorreo).mockResolvedValue(usuarioActivo as never)
  vi.mocked(authRepository.guardarRefreshToken).mockResolvedValue(undefined as never)
  vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
  vi.mocked(prisma.gimnasio.findUnique).mockResolvedValue({ nombre: 'PowerFit' } as never)
})

// ===========================================================================
describe('RF-02 · Inicio de sesión', () => {
  it('devuelve tokens y datos del usuario con credenciales válidas', async () => {
    const resultado = await authService.login({
      correo: 'admin@powerfit.com',
      password: '123456',
    } as never)

    expect(resultado.token).toBe('jwt-de-acceso')
    expect(resultado.refreshToken).toBe('jwt-de-refresco')
    expect(resultado.usuario.rol).toBe('Administrador')
    expect(resultado.usuario.nombre_gimnasio).toBe('PowerFit')
  })

  it('nunca devuelve el hash de la contraseña', async () => {
    const resultado = await authService.login({
      correo: 'admin@powerfit.com',
      password: '123456',
    } as never)

    expect(resultado.usuario).not.toHaveProperty('password_hash')
    expect(serializar(resultado)).not.toContain('$2b$')
  })

  it('rechaza una contraseña incorrecta', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    await expect(
      authService.login({ correo: 'admin@powerfit.com', password: 'mala' } as never),
    ).rejects.toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS', statusCode: 401 })
  })

  it('NO permite enumerar correos registrados', async () => {
    // Correo inexistente
    vi.mocked(authRepository.buscarPorCorreo).mockResolvedValue(null as never)
    const errorCorreoInexistente = await authService
      .login({ correo: 'nadie@ejemplo.com', password: 'x' } as never)
      .catch((e) => e)

    // Correo válido, contraseña incorrecta
    vi.mocked(authRepository.buscarPorCorreo).mockResolvedValue(usuarioActivo as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    const errorPasswordMala = await authService
      .login({ correo: 'admin@powerfit.com', password: 'x' } as never)
      .catch((e) => e)

    // Ambos casos deben ser indistinguibles desde afuera.
    expect(errorCorreoInexistente.message).toBe(errorPasswordMala.message)
    expect(errorCorreoInexistente.codigo).toBe(errorPasswordMala.codigo)
    expect(errorCorreoInexistente.statusCode).toBe(errorPasswordMala.statusCode)
  })

  it('distingue al usuario desactivado con un código propio', async () => {
    vi.mocked(authRepository.buscarPorCorreo).mockResolvedValue({
      ...usuarioActivo,
      estado: false,
    } as never)

    // Aquí sí conviene diferenciarlo: el usuario tiene credenciales correctas
    // y necesita saber que debe contactar al administrador, no reintentar.
    await expect(
      authService.login({ correo: 'admin@powerfit.com', password: '123456' } as never),
    ).rejects.toMatchObject({ codigo: 'USUARIO_INACTIVO', statusCode: 401 })
  })

  it('no compara la contraseña de un usuario desactivado', async () => {
    vi.mocked(authRepository.buscarPorCorreo).mockResolvedValue({
      ...usuarioActivo,
      estado: false,
    } as never)

    await authService
      .login({ correo: 'admin@powerfit.com', password: '123456' } as never)
      .catch(() => undefined)

    expect(bcrypt.compare).not.toHaveBeenCalled()
  })

  it('almacena el refresh token HASHEADO, nunca en texto plano', async () => {
    await authService.login({ correo: 'admin@powerfit.com', password: '123456' } as never)

    const [idUsuario, hashGuardado] = vi.mocked(authRepository.guardarRefreshToken).mock.calls[0]

    expect(idUsuario).toBe(5n)
    expect(hashGuardado).toBe(sha256('jwt-de-refresco'))
    // Si la BD se filtra, los refresh tokens no son reutilizables.
    expect(hashGuardado).not.toBe('jwt-de-refresco')
  })

  it('el refresh token expira a los 7 días', async () => {
    const antes = Date.now()
    await authService.login({ correo: 'admin@powerfit.com', password: '123456' } as never)

    const expiraEn = vi.mocked(authRepository.guardarRefreshToken).mock.calls[0][2] as Date
    const dias = (expiraEn.getTime() - antes) / 86400000

    expect(Math.round(dias)).toBe(7)
  })

  it('purga tokens expirados en cada login', async () => {
    await authService.login({ correo: 'admin@powerfit.com', password: '123456' } as never)
    expect(authRepository.limpiarExpirados).toHaveBeenCalled()
  })
})

// ===========================================================================
describe('RF-02 · Renovación de sesión (refresh)', () => {
  const payload = { id_usuario: 5, id_gimnasio: 1, rol: 'Administrador' }

  beforeEach(() => {
    vi.mocked(verificarRefreshToken).mockReturnValue(payload as never)
    vi.mocked(authRepository.buscarRefreshToken).mockResolvedValue({
      expira_en: new Date(Date.now() + 86400000),
    } as never)
    vi.mocked(authRepository.eliminarRefreshToken).mockResolvedValue(undefined as never)
  })

  it('emite un par de tokens nuevo', async () => {
    const resultado = await authService.refresh('token-viejo')

    expect(resultado.token).toBe('jwt-de-acceso')
    expect(resultado.refreshToken).toBe('jwt-de-refresco')
  })

  it('ROTA el token: invalida el anterior al emitir el nuevo', async () => {
    await authService.refresh('token-viejo')

    // Sin rotación, un refresh token robado serviría indefinidamente.
    expect(authRepository.eliminarRefreshToken).toHaveBeenCalledWith(sha256('token-viejo'))
    expect(authRepository.guardarRefreshToken).toHaveBeenCalled()
  })

  it('rechaza un token que no está en la base', async () => {
    vi.mocked(authRepository.buscarRefreshToken).mockResolvedValue(null as never)

    await expect(authService.refresh('token-inventado')).rejects.toMatchObject({
      codigo: 'REFRESH_INVALIDO',
      statusCode: 401,
    })
  })

  it('rechaza un token almacenado pero ya vencido', async () => {
    vi.mocked(authRepository.buscarRefreshToken).mockResolvedValue({
      expira_en: new Date(Date.now() - 1000),
    } as never)

    await expect(authService.refresh('token-vencido')).rejects.toMatchObject({
      codigo: 'REFRESH_INVALIDO',
    })
  })

  it('rechaza un token con firma inválida', async () => {
    vi.mocked(verificarRefreshToken).mockImplementation(() => {
      throw new Error('firma inválida')
    })

    await expect(authService.refresh('token-manipulado')).rejects.toMatchObject({
      codigo: 'REFRESH_INVALIDO',
    })

    // No debe siquiera consultar la base con un token que no verifica.
    expect(authRepository.buscarRefreshToken).not.toHaveBeenCalled()
  })
})

// ===========================================================================
describe('RF-02 · Cierre de sesión', () => {
  it('elimina el refresh token de la base', async () => {
    vi.mocked(authRepository.eliminarRefreshToken).mockResolvedValue(undefined as never)

    await authService.logout('mi-token')

    expect(authRepository.eliminarRefreshToken).toHaveBeenCalledWith(sha256('mi-token'))
  })

  it('no falla si no se envía token', async () => {
    await expect(authService.logout(undefined)).resolves.toBeUndefined()
    expect(authRepository.eliminarRefreshToken).not.toHaveBeenCalled()
  })

  it('no falla si el token ya no existía', async () => {
    vi.mocked(authRepository.eliminarRefreshToken).mockRejectedValue(
      new Error('no encontrado') as never,
    )

    // Cerrar sesión debe ser idempotente: si ya estabas fuera, no es un error.
    await expect(authService.logout('token-fantasma')).resolves.toBeUndefined()
  })
})
