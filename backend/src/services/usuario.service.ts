import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'
import { recordSecurityAudit } from '../lib/security-audit'
import { usuarioRepository } from '../repositories/usuario.repository'
import { authRepository } from '../repositories/auth.repository'
import type { CrearUsuarioDto, ActualizarUsuarioDto } from '../dtos/usuario.dto'

export const usuarioService = {
  async listar(idGimnasio: bigint) {
    return usuarioRepository.listarPorGimnasio(idGimnasio)
  },

  async perfil(id: bigint, idGimnasio: bigint) {
    const usuario = await usuarioRepository.buscarPerfil(id)
    if (!usuario || usuario.id_gimnasio !== idGimnasio) {
      throw new AppError('Usuario no encontrado', 404, 'NO_ENCONTRADO')
    }
    return {
      id_usuario: Number(usuario.id_usuario),
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      rol: usuario.rol,
      estado: usuario.estado,
      nombre_gimnasio: usuario.gimnasio?.nombre ?? '',
      fecha_creacion: usuario.fecha_creacion,
    }
  },

  async cambiarPassword(id: bigint, idGimnasio: bigint, passwordActual: string, passwordNueva: string) {
    const usuario = await usuarioRepository.buscarPorId(id)
    if (!usuario || usuario.id_gimnasio !== idGimnasio) {
      throw new AppError('Usuario no encontrado', 404, 'NO_ENCONTRADO')
    }
    if (!await bcrypt.compare(passwordActual, usuario.password_hash)) {
      throw new AppError('La contraseña actual no es correcta', 400, 'INVALID_CURRENT_PASSWORD')
    }
    if (await bcrypt.compare(passwordNueva, usuario.password_hash)) {
      throw new AppError('La nueva contraseña debe ser diferente de la actual', 400, 'PASSWORD_UNCHANGED')
    }
    const hash = await bcrypt.hash(passwordNueva, 12)
    await prisma.$transaction(async (tx) => {
      await tx.usuario.update({ where: { id_usuario: id }, data: { password_hash: hash } })
      await authRepository.limpiarRefreshTokensUsuario(id, tx)
    })
    recordSecurityAudit('PASSWORD_CHANGED', { actorType: 'STAFF', actorId: id, gymId: idGimnasio })
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
