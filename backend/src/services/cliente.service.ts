import { prisma } from '../lib/prisma'
import { clienteRepository } from '../repositories/cliente.repository'
import { notificationFactory } from './notification-factory.service'
import { tokenService } from './token.service'
import { emailService } from '../email/email.service'
import { AppError } from '../lib/errors'
import type { CrearClienteDto, ActualizarClienteDto } from '../dtos/cliente.dto'
import type { RequestContext } from '../types/request-context'

export const clienteService = {
  async listar(idGimnasio: bigint, limite = 50) {
    return clienteRepository.listarPorGimnasio(idGimnasio, limite)
  },

  async listarPorEntrenador(idEntrenador: bigint, idGimnasio: bigint) {
    return clienteRepository.listarPorEntrenador(idEntrenador, idGimnasio)
  },

  async buscar(id: bigint, idGimnasio: bigint) {
    const cliente = await clienteRepository.buscarPorIdEnGimnasio(id, idGimnasio)
    if (!cliente) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }
    return cliente
  },

  async buscarParaActor(id: bigint, context: RequestContext) {
    const idEntrenador = context.role === 'Entrenador' ? context.actorId : undefined
    const cliente = await clienteRepository.buscarPorIdEnGimnasio(id, context.gymId, idEntrenador)
    if (!cliente) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }
    return cliente
  },

  async crear(idGimnasio: bigint, dto: CrearClienteDto, idEntrenador?: bigint) {
    const existente = await clienteRepository.buscarPorCedula(dto.cedula)

    if (existente) {
      if (existente.id_gimnasio === idGimnasio) {
        throw Object.assign(new Error('La cédula ya está registrada'), { statusCode: 409 })
      }

      const gym = await prisma.gimnasio.findUnique({
        where: { id_gimnasio: existente.id_gimnasio },
        select: { nombre: true },
      })
      throw new AppError(
        'El cliente ya se encuentra activo en otro gimnasio',
        409,
        'CLIENTE_ACTIVO_OTRO_GYM',
        {
          cliente: {
            id_cliente: Number(existente.id_cliente),
            nombre: existente.nombre,
            apellido: existente.apellido,
            cedula: existente.cedula,
          },
          gimnasio: { nombre: gym?.nombre },
          estado: existente.estado ? 'Activo' : 'Inactivo',
        }
      )
    }

    const porCorreo = await clienteRepository.buscarPorCorreo(dto.correo)
    if (porCorreo) {
      if (porCorreo.id_gimnasio === idGimnasio) {
        throw Object.assign(new Error('El correo ya está registrado'), { statusCode: 409 })
      }

      const gym = await prisma.gimnasio.findUnique({
        where: { id_gimnasio: porCorreo.id_gimnasio },
        select: { nombre: true },
      })
      throw new AppError(
        'El cliente ya se encuentra activo en otro gimnasio',
        409,
        'CLIENTE_ACTIVO_OTRO_GYM',
        {
          cliente: {
            id_cliente: Number(porCorreo.id_cliente),
            nombre: porCorreo.nombre,
            apellido: porCorreo.apellido,
            cedula: porCorreo.cedula,
          },
          gimnasio: { nombre: gym?.nombre },
          estado: porCorreo.estado ? 'Activo' : 'Inactivo',
        }
      )
    }

    const usuarioConCorreo = await prisma.usuario.findUnique({
      where: { correo: dto.correo },
      select: { id_usuario: true },
    })
    if (usuarioConCorreo) {
      throw Object.assign(new Error('El correo ya está registrado como identidad de acceso'), { statusCode: 409 })
    }

    const cliente = await clienteRepository.crear({
      id_gimnasio: idGimnasio,
      id_entrenador: idEntrenador,
      nombre: dto.nombre,
      apellido: dto.apellido,
      cedula: dto.cedula,
      correo: dto.correo,
      telefono: dto.telefono,
      fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : undefined,
    })

    try {
      const token = await tokenService.crearActivacion(cliente.id_cliente)
      const gimnasio = await prisma.gimnasio.findUnique({
        where: { id_gimnasio: idGimnasio },
        select: { nombre: true },
      })
      await emailService.sendPasswordSetupEmail(
        { nombre: cliente.nombre, correo: cliente.correo, gimnasio: gimnasio?.nombre ?? 'tu gimnasio' },
        token,
      )
    } catch (err) {
      console.error('[cliente] Error al enviar correo de activación:', err)
    }

    return cliente
  },

  async buscarPorCedula(cedula: string, idGimnasio: bigint) {
    return clienteRepository.buscarPorCedulaEnGimnasio(cedula, idGimnasio)
  },

  async buscarPorCedulaEntrenador(cedula: string, idEntrenador: bigint, idGimnasio: bigint) {
    return clienteRepository.buscarPorCedulaEnGimnasio(cedula, idGimnasio, idEntrenador)
  },

  async buscarPorNombre(termino: string, idGimnasio: bigint) {
    return clienteRepository.buscarPorNombre(termino, idGimnasio)
  },

  async buscarPorNombreEntrenador(termino: string, idEntrenador: bigint, idGimnasio: bigint) {
    return clienteRepository.buscarPorNombreEntrenador(termino, idEntrenador, idGimnasio)
  },

  async actualizar(id: bigint, dto: ActualizarClienteDto, idGimnasio: bigint, idUsuarioActual: bigint) {
    const cliente = await this.buscar(id, idGimnasio)

    if (dto.cedula && dto.cedula !== cliente.cedula) {
      const existente = await clienteRepository.buscarPorCedula(dto.cedula)
      if (existente) throw Object.assign(new Error('La cédula ya está registrada'), { statusCode: 409 })
    }

    if (dto.correo && dto.correo !== cliente.correo) {
      const existente = await clienteRepository.buscarPorCorreo(dto.correo)
      if (existente && existente.id_cliente !== id) {
        throw Object.assign(new Error('El correo ya está registrado'), { statusCode: 409 })
      }
      const usuarioConCorreo = await prisma.usuario.findUnique({ where: { correo: dto.correo }, select: { id_usuario: true } })
      if (usuarioConCorreo) throw Object.assign(new Error('El correo ya está registrado como identidad de acceso'), { statusCode: 409 })
    }

    // Handle trainer change separately
    if (dto.id_entrenador !== undefined) {
      const nuevoEntrenadorId = dto.id_entrenador ? BigInt(dto.id_entrenador) : null
      const trainerCambio = cliente.id_entrenador !== nuevoEntrenadorId

      if (trainerCambio) {
        if (nuevoEntrenadorId) {
          const entrenador = await prisma.usuario.findUnique({
            where: { id_usuario: nuevoEntrenadorId },
            include: { _count: { select: { clientes_asignados: true } } },
          })

          if (!entrenador || entrenador.id_gimnasio !== idGimnasio || entrenador.rol !== 'Entrenador') {
            throw Object.assign(new Error('Entrenador no encontrado o no válido'), { statusCode: 404 })
          }
          if (!entrenador.estado) {
            throw Object.assign(new Error('El entrenador está inactivo'), { statusCode: 400 })
          }
          if (entrenador._count.clientes_asignados >= entrenador.capacidad_max) {
            throw Object.assign(new Error('El entrenador ha alcanzado su capacidad máxima'), { statusCode: 400 })
          }
        }

        await clienteRepository.actualizar(id, { id_entrenador: nuevoEntrenadorId })

        // Notifications
        const notifs: Array<{ tipo: 'SISTEMA'; destino: { id_gimnasio: bigint; id_cliente?: bigint; id_usuario_destino?: bigint }; titulo: string; mensaje: string }> = []

        notifs.push({
          tipo: 'SISTEMA',
          destino: { id_gimnasio: idGimnasio },
          titulo: 'Entrenador actualizado',
          mensaje: `El entrenador de ${cliente.nombre} ${cliente.apellido} ha sido actualizado.`,
        })

        if (nuevoEntrenadorId) {
          notifs.push({
            tipo: 'SISTEMA',
            destino: { id_gimnasio: idGimnasio, id_usuario_destino: nuevoEntrenadorId, id_cliente: id },
            titulo: 'Nuevo cliente asignado',
            mensaje: `Se te ha asignado el cliente ${cliente.nombre} ${cliente.apellido}.`,
          })
        }

        await notificationFactory.crearMultiple(notifs)
      }
    }

    // Remove id_entrenador from generic update to avoid double-write
    const { id_entrenador: _, ...restDto } = dto
    return clienteRepository.actualizar(id, {
      ...restDto,
      fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : undefined,
    })
  },

  async eliminar(id: bigint, idGimnasio: bigint) {
    await this.buscar(id, idGimnasio)
    await prisma.$transaction([
      prisma.pago.deleteMany({ where: { id_cliente: id } }),
      prisma.clienteMembresia.deleteMany({ where: { id_cliente: id } }),
      prisma.asistencia.deleteMany({ where: { id_cliente: id } }),
      prisma.clienteRutina.deleteMany({ where: { id_cliente: id } }),
      prisma.notificacion.deleteMany({ where: { id_cliente: id } }),
      prisma.solicitudTransferencia.deleteMany({ where: { id_cliente: id } }),
      prisma.cliente.delete({ where: { id_cliente: id } }),
    ])
  },
}
