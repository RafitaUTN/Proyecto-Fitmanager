import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { authRepository } from '../repositories/auth.repository'
import { firmarToken, firmarRefreshToken, verificarRefreshToken } from '../lib/jwt'
import { hashToken } from '../lib/token-hash'
import { AppError } from '../lib/errors'
import type { LoginDto } from '../dtos/auth.dto'

export const authService = {
  async crearSesionUsuario(usuario: { id_usuario: bigint; id_gimnasio: bigint; rol: string }) {
    const payload = { id_usuario: Number(usuario.id_usuario), id_gimnasio: Number(usuario.id_gimnasio), rol: usuario.rol }
    const token = firmarToken(payload)
    const refreshToken = firmarRefreshToken(payload)
    await authRepository.guardarRefreshToken(
      usuario.id_usuario,
      hashToken(refreshToken),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    )
    return { token, refreshToken }
  },

  async login(dto: LoginDto) {
    await authRepository.limpiarExpirados()
    const [usuario, cliente] = await Promise.all([
      authRepository.buscarPorCorreo(dto.correo),
      prisma.cliente.findUnique({
        where: { correo: dto.correo },
        include: { gimnasio: { select: { estado: true, nombre: true } } },
      }),
    ])
    if (usuario && cliente) {
      console.warn(JSON.stringify({ level: 'warn', event: 'identity_conflict', correo: dto.correo }))
      throw new AppError('Este correo está asociado a más de un tipo de cuenta. Contacta al administrador.', 409, 'IDENTIDAD_AMBIGUA')
    }
    if (!usuario && !cliente) {
      throw new AppError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS')
    }
    if (cliente) {
      if (!cliente.estado || !cliente.gimnasio.estado || !cliente.contrasena || !await bcrypt.compare(dto.password, cliente.contrasena)) {
        throw new AppError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS')
      }
      const payload = { id_usuario: Number(cliente.id_cliente), id_gimnasio: Number(cliente.id_gimnasio), rol: 'Cliente' }
      const token = firmarToken(payload)
      const refreshToken = firmarRefreshToken(payload)
      await prisma.$transaction(async (tx) => {
        await tx.cliente.update({ where: { id_cliente: cliente.id_cliente }, data: { ultimo_acceso: new Date() } })
        await authRepository.guardarRefreshTokenCliente(
          cliente.id_cliente, hashToken(refreshToken), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), tx,
        )
      })
      return {
        actorType: 'CLIENTE' as const,
        role: 'Cliente' as const,
        token,
        refreshToken,
        cliente: { id_cliente: Number(cliente.id_cliente), nombre: cliente.nombre, apellido: cliente.apellido, correo: cliente.correo },
      }
    }

    if (!usuario!.estado || !await bcrypt.compare(dto.password, usuario!.password_hash)) {
      throw new AppError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS')
    }
    const gym = await prisma.gimnasio.findFirst({
      where: { id_gimnasio: usuario!.id_gimnasio, estado: true },
      select: { nombre: true },
    })
    if (!gym) throw new AppError('Cuenta inactiva', 401, 'CUENTA_INACTIVA')

    const sesion = await this.crearSesionUsuario(usuario!)
    return {
      ...sesion,
      actorType: 'STAFF' as const,
      role: usuario!.rol,
      usuario: {
        id_usuario: usuario!.id_usuario, id_gimnasio: usuario!.id_gimnasio, nombre_gimnasio: gym.nombre,
        nombre: usuario!.nombre, apellido: usuario!.apellido, correo: usuario!.correo, rol: usuario!.rol,
      },
    }
  },

  async refresh(refreshToken: string) {
    let payload
    try {
      payload = verificarRefreshToken(refreshToken)
    } catch {
      throw new AppError('Refresh token inválido o expirado', 401, 'REFRESH_INVALIDO')
    }
    const tokenHash = hashToken(refreshToken)
    return prisma.$transaction(async (tx) => {
      const ahora = new Date()
      let newPayload: { id_usuario: number; id_gimnasio: number; rol: string }
      let identidad: Record<string, unknown>

      if (payload.rol === 'Cliente') {
        const stored = await authRepository.buscarRefreshTokenCliente(tokenHash, tx)
        if (!stored || stored.expira_en < ahora || stored.id_cliente !== BigInt(payload.id_usuario)) {
          throw new AppError('Refresh token inválido o expirado', 401, 'REFRESH_INVALIDO')
        }
        const cliente = await tx.cliente.findFirst({
          where: { id_cliente: stored.id_cliente, estado: true, gimnasio: { estado: true } },
          select: { id_cliente: true, id_gimnasio: true, nombre: true, apellido: true, correo: true },
        })
        if (!cliente) throw new AppError('Sesión revocada', 401, 'SESION_REVOCADA')
        await authRepository.eliminarRefreshTokenCliente(tokenHash, tx)
        newPayload = { id_usuario: Number(cliente.id_cliente), id_gimnasio: Number(cliente.id_gimnasio), rol: 'Cliente' }
        identidad = {
          cliente: {
            id_cliente: Number(cliente.id_cliente), nombre: cliente.nombre,
            apellido: cliente.apellido, correo: cliente.correo,
          },
        }
      } else {
        const stored = await authRepository.buscarRefreshToken(tokenHash, tx)
        if (!stored || stored.expira_en < ahora || stored.id_usuario !== BigInt(payload.id_usuario)) {
          throw new AppError('Refresh token inválido o expirado', 401, 'REFRESH_INVALIDO')
        }
        const usuario = await tx.usuario.findFirst({
          where: { id_usuario: stored.id_usuario, estado: true, gimnasio: { estado: true } },
          select: {
            id_usuario: true, id_gimnasio: true, rol: true, nombre: true, apellido: true, correo: true,
            gimnasio: { select: { nombre: true } },
          },
        })
        if (!usuario) throw new AppError('Sesión revocada', 401, 'SESION_REVOCADA')
        await authRepository.eliminarRefreshToken(tokenHash, tx)
        newPayload = { id_usuario: Number(usuario.id_usuario), id_gimnasio: Number(usuario.id_gimnasio), rol: usuario.rol }
        identidad = {
          usuario: {
            id_usuario: Number(usuario.id_usuario), id_gimnasio: Number(usuario.id_gimnasio),
            nombre_gimnasio: usuario.gimnasio.nombre, nombre: usuario.nombre, apellido: usuario.apellido,
            correo: usuario.correo, rol: usuario.rol,
          },
        }
      }

      const token = firmarToken(newPayload)
      const nextRefresh = firmarRefreshToken(newPayload)
      const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      if (newPayload.rol === 'Cliente') {
        await authRepository.guardarRefreshTokenCliente(BigInt(newPayload.id_usuario), hashToken(nextRefresh), expiraEn, tx)
      } else {
        await authRepository.guardarRefreshToken(BigInt(newPayload.id_usuario), hashToken(nextRefresh), expiraEn, tx)
      }
      return {
        token,
        refreshToken: nextRefresh,
        actorType: newPayload.rol === 'Cliente' ? 'CLIENTE' as const : 'STAFF' as const,
        role: newPayload.rol,
        ...identidad,
      }
    })
  },

  async logout(refreshToken?: string) {
    if (!refreshToken) return
    const tokenHash = hashToken(refreshToken)
    await prisma.$transaction(async (tx) => {
      await authRepository.eliminarRefreshToken(tokenHash, tx)
      await authRepository.eliminarRefreshTokenCliente(tokenHash, tx)
    })
  },
}
