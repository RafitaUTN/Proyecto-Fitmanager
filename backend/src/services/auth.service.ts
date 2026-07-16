import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { firmarToken } from '../lib/jwt'
import type { LoginDto } from '../dtos/auth.dto'

export const authService = {
  async login(dto: LoginDto) {
    const usuario = await prisma.usuario.findUnique({ where: { correo: dto.correo } })
    if (!usuario) throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 })
    if (!usuario.estado) throw Object.assign(new Error('Usuario inactivo'), { statusCode: 401 })

    const valida = await bcrypt.compare(dto.password, usuario.password_hash)
    if (!valida) throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 })

    const token = firmarToken({
      id_usuario: Number(usuario.id_usuario),
      id_gimnasio: Number(usuario.id_gimnasio),
      rol: usuario.rol,
    })

    return {
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    }
  },
}
