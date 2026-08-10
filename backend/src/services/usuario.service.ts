import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { usuarioRepository } from '../repositories/usuario.repository'
import type { CrearUsuarioDto, ActualizarUsuarioDto } from '../dtos/usuario.dto'

export const usuarioService = {
  async listar(idGimnasio: bigint) {
    return usuarioRepository.listarPorGimnasio(idGimnasio)
  },

  async crear(idGimnasio: bigint, dto: CrearUsuarioDto) {
    const [existente, cliente] = await Promise.all([
      usuarioRepository.buscarPorCorreo(dto.correo),
      prisma.cliente.findUnique({ where: { correo: dto.correo }, select: { id_cliente: true } }),
    ])
    if (existente || cliente) throw Object.assign(new Error('El correo ya está registrado como identidad de acceso'), { statusCode: 409 })

    const password_hash = await bcrypt.hash(dto.password, 10)
    const data: any = { ...dto, id_gimnasio: idGimnasio, password_hash }
    delete data.password
    return usuarioRepository.crear(data)
  },

  async actualizar(id: bigint, dto: ActualizarUsuarioDto, idGimnasio: bigint, idAutenticado?: bigint) {
    const usuario = await usuarioRepository.buscarPorId(id)
    if (!usuario || usuario.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 })
    }

    if (dto.estado === false && idAutenticado && id === idAutenticado) {
      throw Object.assign(new Error('No puedes desactivarte a ti mismo'), { statusCode: 400 })
    }

    if (dto.correo && dto.correo !== usuario.correo) {
      const [existente, cliente] = await Promise.all([
        usuarioRepository.buscarPorCorreo(dto.correo),
        prisma.cliente.findUnique({ where: { correo: dto.correo }, select: { id_cliente: true } }),
      ])
      if (existente || cliente) throw Object.assign(new Error('El correo ya está registrado como identidad de acceso'), { statusCode: 409 })
    }

    const contandoAdmins = usuario.rol === 'Administrador' || dto.rol === 'Administrador'
    if (contandoAdmins) {
      const adminsActivos = await prisma.usuario.count({
        where: { id_gimnasio: idGimnasio, rol: 'Administrador', estado: true },
      })

      const seraAdmin = dto.rol === 'Administrador'
      const esAdminActual = usuario.rol === 'Administrador'
      const seDesactiva = dto.estado === false

      if (esAdminActual && seraAdmin === false && adminsActivos <= 1) {
        throw Object.assign(new Error('Debe haber al menos un administrador activo en el gimnasio'), { statusCode: 400 })
      }

      if (seDesactiva && esAdminActual && adminsActivos <= 1) {
        throw Object.assign(new Error('Debe haber al menos un administrador activo en el gimnasio'), { statusCode: 400 })
      }
    }

    const data: any = { ...dto }
    if (dto.password) data.password_hash = await bcrypt.hash(dto.password, 10)
    delete data.password

    return usuarioRepository.actualizar(id, data)
  },

  async eliminar(id: bigint, idGimnasio: bigint, idAutenticado?: bigint) {
    const usuario = await usuarioRepository.buscarPorId(id)
    if (!usuario || usuario.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 })
    }

    if (idAutenticado && id === idAutenticado) {
      throw Object.assign(new Error('No puedes eliminarte a ti mismo'), { statusCode: 400 })
    }

    if (usuario.rol === 'Administrador') {
      const adminsActivos = await prisma.usuario.count({
        where: { id_gimnasio: idGimnasio, rol: 'Administrador', estado: true },
      })
      if (adminsActivos <= 1) {
        throw Object.assign(new Error('Debe haber al menos un administrador activo en el gimnasio'), { statusCode: 400 })
      }
    }

    const [clientesAsignados, rutinasCreadas, asignacionesRutina, solicitudes] = await Promise.all([
      prisma.cliente.count({ where: { id_entrenador: id } }),
      prisma.rutina.count({ where: { id_usuario_creador: id } }),
      prisma.clienteRutina.count({ where: { id_entrenador_asignador: id } }),
      prisma.solicitudTransferencia.count({
        where: { OR: [{ id_usuario_solicita: id }, { id_usuario_respuesta: id }] },
      }),
    ])
    if (clientesAsignados > 0 || rutinasCreadas > 0 || asignacionesRutina > 0 || solicitudes > 0) {
      throw Object.assign(new Error('No se puede eliminar el usuario porque tiene registros asociados'), { statusCode: 409 })
    }

    await usuarioRepository.eliminar(id)
  },
}
