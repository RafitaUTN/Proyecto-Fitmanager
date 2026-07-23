import bcrypt from 'bcrypt'
import { authRepository } from '../repositories/auth.repository'
import { firmarToken, firmarRefreshToken, verificarRefreshToken } from '../lib/jwt'
import type { LoginDto } from '../dtos/auth.dto'

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

    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await authRepository.guardarRefreshToken(usuario.id_usuario, refreshToken, expiraEn)

    return {
      token,
      refreshToken,
      usuario: {
        id_usuario: usuario.id_usuario,
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

    const stored = await authRepository.buscarRefreshToken(refreshToken)
    if (!stored || stored.expira_en < new Date()) {
      throw Object.assign(new Error('Refresh token inválido o expirado'), { statusCode: 401 })
    }

    await authRepository.eliminarRefreshToken(refreshToken)

    const newPayload = {
      id_usuario: payload.id_usuario,
      id_gimnasio: payload.id_gimnasio,
      rol: payload.rol,
    }

    const newToken = firmarToken(newPayload)
    const newRefreshToken = firmarRefreshToken(newPayload)

    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await authRepository.guardarRefreshToken(BigInt(payload.id_usuario), newRefreshToken, expiraEn)

    return { token: newToken, refreshToken: newRefreshToken }
  },
}
