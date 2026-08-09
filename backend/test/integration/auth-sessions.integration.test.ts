import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let prisma: any
let authService: any
let clienteAuthService: any
let passwordRecoveryService: any
let tokenService: any
let gymId: bigint
let usuarioId: bigint
let clienteId: bigint
let correoStaff: string
let correoCliente: string
const password = 'ClaveSegura#2026'

function requireIsolatedDatabase() {
  const raw = process.env.TEST_DATABASE_URL
  if (!raw) throw new Error('TEST_DATABASE_URL es obligatoria para integration tests')
  const url = new URL(raw)
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(url.hostname)) {
    throw new Error(`Integration tests bloqueados fuera de localhost: ${url.hostname}`)
  }
  process.env.DATABASE_URL = raw
}

beforeAll(async () => {
  requireIsolatedDatabase()
  ;({ prisma } = await import('../../src/lib/prisma'))
  ;({ authService } = await import('../../src/services/auth.service'))
  ;({ clienteAuthService } = await import('../../src/services/cliente-auth.service'))
  ;({ passwordRecoveryService } = await import('../../src/services/password-recovery.service'))
  ;({ tokenService } = await import('../../src/services/token.service'))
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  correoStaff = `staff-session-${suffix}@test.invalid`
  correoCliente = `client-session-${suffix}@test.invalid`
  const gimnasio = await prisma.gimnasio.create({ data: { nombre: 'Auth integration', correo: `gym-session-${suffix}@test.invalid` } })
  gymId = gimnasio.id_gimnasio
  const hash = await bcrypt.hash(password, 4)
  const usuario = await prisma.usuario.create({
    data: { id_gimnasio: gymId, nombre: 'Staff', apellido: 'Session', correo: correoStaff, password_hash: hash, rol: 'Administrador' },
  })
  usuarioId = usuario.id_usuario
  const cliente = await prisma.cliente.create({
    data: { id_gimnasio: gymId, nombre: 'Client', apellido: 'Session', cedula: `session-${suffix}`, correo: correoCliente, contrasena: hash },
  })
  clienteId = cliente.id_cliente
})

afterAll(async () => {
  if (!prisma || !gymId) return
  await prisma.refreshToken.deleteMany({ where: { id_usuario: usuarioId } })
  await prisma.clienteRefreshToken.deleteMany({ where: { id_cliente: clienteId } })
  await prisma.cliente.delete({ where: { id_cliente: clienteId } })
  await prisma.usuario.delete({ where: { id_usuario: usuarioId } })
  await prisma.gimnasio.delete({ where: { id_gimnasio: gymId } })
  await prisma.$disconnect()
})

describe('ciclo de sesiones staff/cliente en PostgreSQL real', () => {
  it('rota y revoca la sesión staff, con access token corto y claims', async () => {
    const login = await authService.login({ correo: correoStaff, password })
    const decoded = jwt.decode(login.token) as jwt.JwtPayload
    expect(decoded.iss).toBe('fitmanager-api')
    expect(decoded.aud).toBe('fitmanager-web')
    expect(decoded.jti).toBeTruthy()
    expect((decoded.exp as number) - (decoded.iat as number)).toBe(15 * 60)

    const rotated = await authService.refresh(login.refreshToken)
    await expect(authService.refresh(login.refreshToken)).rejects.toMatchObject({ statusCode: 401 })
    await authService.logout(rotated.refreshToken)
    await expect(authService.refresh(rotated.refreshToken)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('persiste/rota refresh de cliente y deniega al desactivarlo', async () => {
    const login = await clienteAuthService.login({ correo: correoCliente, password })
    expect(await prisma.clienteRefreshToken.count({ where: { id_cliente: clienteId } })).toBe(1)
    const rotated = await authService.refresh(login.refreshToken)
    await expect(authService.refresh(login.refreshToken)).rejects.toMatchObject({ statusCode: 401 })
    await prisma.cliente.update({ where: { id_cliente: clienteId }, data: { estado: false } })
    await expect(authService.refresh(rotated.refreshToken)).rejects.toMatchObject({ statusCode: 401, codigo: 'SESION_REVOCADA' })
    await prisma.cliente.update({ where: { id_cliente: clienteId }, data: { estado: true } })
  })

  it('consume recuperación una sola vez e invalida todas las sesiones del cliente', async () => {
    await clienteAuthService.login({ correo: correoCliente, password })
    const token = await tokenService.crearRecuperacion(clienteId)
    const nueva = 'NuevaClave#2026'
    await passwordRecoveryService.restablecer(token, nueva)
    expect(await prisma.clienteRefreshToken.count({ where: { id_cliente: clienteId } })).toBe(0)
    await expect(passwordRecoveryService.restablecer(token, nueva)).rejects.toMatchObject({ statusCode: 400, codigo: 'TOKEN_INVALIDO' })
    await expect(clienteAuthService.login({ correo: correoCliente, password: nueva })).resolves.toHaveProperty('token')
  })
})
