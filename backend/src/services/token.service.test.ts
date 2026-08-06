/**
 * Pruebas unitarias de token.service
 *
 * Los tokens de activación son los que se envían por correo para que un
 * cliente recién registrado defina su contraseña (RF-14, Portal del Cliente).
 * Quien tenga un token válido puede tomar control de esa cuenta, así que el
 * módulo es sensible aunque sea pequeño.
 *
 * Se verifica que el token viaje al correo en claro pero se guarde hasheado,
 * que sea de un solo uso, que caduque, y que todos los motivos de rechazo
 * devuelvan el mismo mensaje para no dar pistas a quien pruebe enlaces.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

vi.mock('../lib/prisma', () => ({
  prisma: {
    token: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}))

import { tokenService } from './token.service'
import { prisma } from '../lib/prisma'

const ID_CLIENTE = 10n
const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex')

const enElFuturo = () => new Date(Date.now() + 3600_000)
const enElPasado = () => new Date(Date.now() - 1000)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.token.create).mockResolvedValue({} as never)
  vi.mocked(prisma.token.update).mockResolvedValue({} as never)
})

// ===========================================================================
describe('Creación de tokens de activación', () => {
  it('devuelve el token en claro pero guarda solo su hash', async () => {
    const token = await tokenService.crearActivacion(ID_CLIENTE)

    const datos = vi.mocked(prisma.token.create).mock.calls[0][0] as {
      data: { token_hash: string; id_cliente: bigint; tipo: string }
    }

    // El token en claro se va al correo; en la base queda el hash. Si la base
    // se filtra, nadie puede reconstruir los enlaces de activación.
    expect(datos.data.token_hash).toBe(sha256(token))
    expect(datos.data.token_hash).not.toBe(token)
    expect(datos.data.id_cliente).toBe(ID_CLIENTE)
    expect(datos.data.tipo).toBe('ACTIVACION')
  })

  it('genera tokens de 256 bits en hexadecimal', async () => {
    const token = await tokenService.crearActivacion(ID_CLIENTE)

    // 32 bytes aleatorios = 64 caracteres hex. Suficiente para que no se
    // pueda adivinar por fuerza bruta.
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('nunca genera dos tokens iguales', async () => {
    const emitidos = new Set<string>()
    for (let i = 0; i < 50; i++) {
      emitidos.add(await tokenService.crearActivacion(ID_CLIENTE))
    }
    expect(emitidos.size).toBe(50)
  })

  it('caduca a las 24 horas', async () => {
    const antes = Date.now()
    await tokenService.crearActivacion(ID_CLIENTE)

    const datos = vi.mocked(prisma.token.create).mock.calls[0][0] as {
      data: { expira_en: Date }
    }
    const horas = (datos.data.expira_en.getTime() - antes) / 3600_000

    expect(Math.round(horas)).toBe(24)
  })
})

// ===========================================================================
describe('Validación de tokens', () => {
  it('acepta un token vigente y sin usar', async () => {
    vi.mocked(prisma.token.findUnique).mockResolvedValue({
      id_cliente: ID_CLIENTE,
      tipo: 'ACTIVACION',
      usado_en: null,
      expira_en: enElFuturo(),
    } as never)

    const resultado = await tokenService.validarToken('token-cualquiera', 'ACTIVACION')
    expect(resultado.id_cliente).toBe(ID_CLIENTE)
  })

  it('busca por el hash, nunca por el token en claro', async () => {
    vi.mocked(prisma.token.findUnique).mockResolvedValue({
      id_cliente: ID_CLIENTE,
      tipo: 'ACTIVACION',
      usado_en: null,
      expira_en: enElFuturo(),
    } as never)

    await tokenService.validarToken('mi-token', 'ACTIVACION')

    expect(prisma.token.findUnique).toHaveBeenCalledWith({
      where: { token_hash: sha256('mi-token') },
    })
  })

  it('rechaza un token inexistente', async () => {
    vi.mocked(prisma.token.findUnique).mockResolvedValue(null as never)

    await expect(tokenService.validarToken('inventado', 'ACTIVACION')).rejects.toMatchObject({
      codigo: 'TOKEN_INVALIDO',
      statusCode: 400,
    })
  })

  it('rechaza un token ya usado', async () => {
    vi.mocked(prisma.token.findUnique).mockResolvedValue({
      id_cliente: ID_CLIENTE,
      tipo: 'ACTIVACION',
      usado_en: new Date(),
      expira_en: enElFuturo(),
    } as never)

    await expect(tokenService.validarToken('usado', 'ACTIVACION')).rejects.toMatchObject({
      codigo: 'TOKEN_INVALIDO',
    })
  })

  it('rechaza un token vencido', async () => {
    vi.mocked(prisma.token.findUnique).mockResolvedValue({
      id_cliente: ID_CLIENTE,
      tipo: 'ACTIVACION',
      usado_en: null,
      expira_en: enElPasado(),
    } as never)

    await expect(tokenService.validarToken('vencido', 'ACTIVACION')).rejects.toMatchObject({
      codigo: 'TOKEN_INVALIDO',
    })
  })

  it('todos los rechazos dan el mismo mensaje y código', async () => {
    const escenarios = [
      null,
      { tipo: 'OTRO', usado_en: null, expira_en: enElFuturo(), id_cliente: ID_CLIENTE },
      { tipo: 'ACTIVACION', usado_en: new Date(), expira_en: enElFuturo(), id_cliente: ID_CLIENTE },
      { tipo: 'ACTIVACION', usado_en: null, expira_en: enElPasado(), id_cliente: ID_CLIENTE },
    ]

    const errores = []
    for (const escenario of escenarios) {
      vi.mocked(prisma.token.findUnique).mockResolvedValue(escenario as never)
      errores.push(await tokenService.validarToken('x', 'ACTIVACION').catch((e) => e))
    }

    // Distinguir "no existe" de "ya se usó" o "venció" le daría información
    // útil a quien esté probando enlaces al azar.
    const mensajes = new Set(errores.map((e) => e.message))
    const codigos = new Set(errores.map((e) => e.codigo))
    expect(mensajes.size).toBe(1)
    expect(codigos.size).toBe(1)
  })
})

// ===========================================================================
describe('Consumo de tokens (un solo uso)', () => {
  beforeEach(() => {
    vi.mocked(prisma.token.findUnique).mockResolvedValue({
      id_cliente: ID_CLIENTE,
      tipo: 'ACTIVACION',
      usado_en: null,
      expira_en: enElFuturo(),
    } as never)
  })

  it('marca el token como usado', async () => {
    await tokenService.usarToken('mi-token', 'ACTIVACION')

    const argumento = vi.mocked(prisma.token.update).mock.calls[0][0] as {
      where: { token_hash: string }
      data: { usado_en: Date }
    }
    expect(argumento.where.token_hash).toBe(sha256('mi-token'))
    expect(argumento.data.usado_en).toBeInstanceOf(Date)
  })

  it('valida antes de consumir', async () => {
    vi.mocked(prisma.token.findUnique).mockResolvedValue(null as never)

    await expect(tokenService.usarToken('inventado', 'ACTIVACION')).rejects.toMatchObject({
      codigo: 'TOKEN_INVALIDO',
    })

    // Un token inválido no debe dejar rastro de consumo.
    expect(prisma.token.update).not.toHaveBeenCalled()
  })

  it('devuelve el cliente al que pertenece', async () => {
    const resultado = await tokenService.usarToken('mi-token', 'ACTIVACION')
    expect(resultado.id_cliente).toBe(ID_CLIENTE)
  })
})
