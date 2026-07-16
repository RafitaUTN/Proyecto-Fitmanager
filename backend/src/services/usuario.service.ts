import bcrypt from 'bcrypt'
import { usuarioRepository } from '../repositories/usuario.repository'
import type { CrearUsuarioDto, ActualizarUsuarioDto } from '../dtos/usuario.dto'

export const usuarioService = {
  async listar(idGimnasio: bigint) {
    return usuarioRepository.listarPorGimnasio(idGimnasio)
  },

  async crear(idGimnasio: bigint, dto: CrearUsuarioDto) {
    const existente = await usuarioRepository.buscarPorCorreo(dto.correo)
    if (existente) throw Object.assign(new Error('El correo ya está registrado'), { statusCode: 409 })

    const password_hash = await bcrypt.hash(dto.password, 10)
    return usuarioRepository.crear({ ...dto, id_gimnasio: idGimnasio, password_hash })
  },

  async actualizar(id: bigint, dto: ActualizarUsuarioDto, idGimnasio: bigint) {
    const usuario = await usuarioRepository.buscarPorId(id)
    if (!usuario || usuario.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 })
    }

    if (dto.correo && dto.correo !== usuario.correo) {
      const existente = await usuarioRepository.buscarPorCorreo(dto.correo)
      if (existente) throw Object.assign(new Error('El correo ya está registrado'), { statusCode: 409 })
    }

    const data: any = { ...dto }
    if (dto.password) data.password_hash = await bcrypt.hash(dto.password, 10)
    delete data.password

    return usuarioRepository.actualizar(id, data)
  },
}
