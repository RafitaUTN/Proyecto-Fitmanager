import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { authRepository } from '../repositories/auth.repository'
import { firmarToken, firmarRefreshToken, verificarRefreshToken } from '../lib/jwt'
import type { LoginDto } from '../dtos/auth.dto'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const authService = {
  async login(dto: LoginDto) {
    const usuario = await authRepository.buscarPorCorreo(dto.correo)
    if (!usuario) throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 })
    if (!usuario.estado) throw Object.assign(new Error('Usuario inactivo'), { statusCode: 401 })

    const valida = await bcrypt.compare(dto.password, usuario.password_hash)
    if (!valida) throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 })

    const payload = {
      id_usuario: Number(usuario.id_usuario),
      id_gimnasio: Number(usuario.id_gimnasio),
      rol: usuario.rol,
    }

    const token = firmarToken(payload)
    const refreshToken = firmarRefreshToken(payload)
    const tokenHash = hashToken(refreshToken)

    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await authRepository.guardarRefreshToken(usuario.id_usuario, tokenHash, expiraEn)

    return {
      token,
      refreshToken,
      usuario: {
        id_usuario: usuario.id_usuario,
        id_gimnasio: usuario.id_gimnasio,
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
      throw Object.assign(new Error('Refresh token inválido o expirado'), { statusCode: 401 })
    }

    const tokenHash = hashToken(refreshToken)
    const stored = await authRepository.buscarRefreshToken(tokenHash)
    if (!stored || stored.expira_en < new Date()) {
      throw Object.assign(new Error('Refresh token inválido o expirado'), { statusCode: 401 })
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
