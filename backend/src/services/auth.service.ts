import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { authRepository } from '../repositories/auth.repository'
import { firmarToken, firmarRefreshToken, verificarRefreshToken } from '../lib/jwt'
import { AppError } from '../lib/errors'
import type { LoginDto } from '../dtos/auth.dto'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const authService = {
  async login(dto: LoginDto) {
    await authRepository.limpiarExpirados()
    const usuario = await authRepository.buscarPorCorreo(dto.correo)
    if (!usuario) {
      throw new AppError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS')
    }
    if (!usuario.estado) {
      throw new AppError('Usuario inactivo. Contacta al administrador.', 401, 'USUARIO_INACTIVO')
    }

    const valida = await bcrypt.compare(dto.password, usuario.password_hash)
    if (!valida) {
      throw new AppError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS')
    }

    const payload = {
      id_usuario: Number(usuario.id_usuario),
      id_gimnasio: Number(usuario.id_gimnasio),
      rol: usuario.rol,
    }

    const token = firmarToken(payload)
    const refreshToken = firmarRefreshToken(payload)
    const tokenHash = hashToken(refreshToken)

    const gym = await prisma.gimnasio.findUnique({
      where: { id_gimnasio: usuario.id_gimnasio },
      select: { nombre: true },
    })

    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await authRepository.guardarRefreshToken(usuario.id_usuario, tokenHash, expiraEn)

    return {
      token,
      refreshToken,
      usuario: {
        id_usuario: usuario.id_usuario,
        id_gimnasio: usuario.id_gimnasio,
        nombre_gimnasio: gym?.nombre ?? '',
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol: usuario.rol,
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
    const stored = await authRepository.buscarRefreshToken(tokenHash)
    if (!stored || stored.expira_en < new Date()) {
      throw new AppError('Refresh token inválido o expirado', 401, 'REFRESH_INVALIDO')
    }

    await authRepository.eliminarRefreshToken(tokenHash)

    const newPayload = {
      id_usuario: payload.id_usuario,
      id_gimnasio: payload.id_gimnasio,
      rol: payload.rol,
    }

    const newToken = firmarToken(newPayload)
    const newRefreshToken = firmarRefreshToken(newPayload)
    const newTokenHash = hashToken(newRefreshToken)

    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await authRepository.guardarRefreshToken(BigInt(payload.id_usuario), newTokenHash, expiraEn)

    return { token: newToken, refreshToken: newRefreshToken }
  },

  async logout(refreshToken?: string) {
    if (!refreshToken) return
    const tokenHash = hashToken(refreshToken)
    try {
      await authRepository.eliminarRefreshToken(tokenHash)
    } catch {
      // token not found — ignore
    }
  },
}
