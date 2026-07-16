import bcrypt from 'bcrypt'
import { gimnasioRepository } from '../repositories/gimnasio.repository'
import type { RegistrarGimnasioDto } from '../dtos/gimnasio.dto'

export const gimnasioService = {
  async registrar(dto: RegistrarGimnasioDto) {
    const existente = await gimnasioRepository.buscarPorCorreo(dto.correo)
    if (existente) throw Object.assign(new Error('El correo del gimnasio ya está registrado'), { statusCode: 409 })

    const password_hash = await bcrypt.hash(dto.usuario.password, 10)

    return gimnasioRepository.crearConAdmin({
      gimnasio: {
        nombre: dto.nombre,
        correo: dto.correo,
        telefono: dto.telefono,
        direccion: dto.direccion,
      },
      admin: {
        nombre: dto.usuario.nombre,
        apellido: dto.usuario.apellido,
        correo: dto.usuario.correo,
        password_hash,
      },
    })
  },
}
