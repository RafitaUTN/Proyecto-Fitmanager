import { prisma } from '../lib/prisma'
import { clienteRepository } from '../repositories/cliente.repository'
import type { CrearClienteDto, ActualizarClienteDto } from '../dtos/cliente.dto'

export const clienteService = {
  async listar(idGimnasio: bigint) {
    return clienteRepository.listarPorGimnasio(idGimnasio)
  },

  async buscar(id: bigint, idGimnasio: bigint) {
    const cliente = await clienteRepository.buscarPorId(id)
    if (!cliente || cliente.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }
    return cliente
  },

  async crear(idGimnasio: bigint, dto: CrearClienteDto) {
    const existente = await clienteRepository.buscarPorCedula(dto.cedula)

    if (existente) {
      if (existente.id_gimnasio === idGimnasio) {
        throw Object.assign(new Error('La cédula ya está registrada'), { statusCode: 409 })
      }

      if (existente.estado) {
        const gym = await prisma.gimnasio.findUnique({
          where: { id_gimnasio: existente.id_gimnasio },
          select: { nombre: true },
        })
        throw Object.assign(new Error(JSON.stringify({
          codigo: 'CLIENTE_ACTIVO_OTRO_GYM',
          cliente: {
            id_cliente: Number(existente.id_cliente),
            nombre: existente.nombre,
            apellido: existente.apellido,
            cedula: existente.cedula,
          },
          gimnasio: { nombre: gym?.nombre },
          estado: 'Activo',
        })), { statusCode: 409 })
      }

      return clienteRepository.actualizar(existente.id_cliente, {
        id_gimnasio: idGimnasio,
        nombre: dto.nombre,
        apellido: dto.apellido,
        cedula: dto.cedula,
        correo: dto.correo,
        telefono: dto.telefono,
        fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : undefined,
        estado: true,
      })
    }

    const porCorreo = await clienteRepository.buscarPorCorreo(dto.correo)
    if (porCorreo) {
      if (porCorreo.id_gimnasio === idGimnasio) {
        throw Object.assign(new Error('El correo ya está registrado'), { statusCode: 409 })
      }
      if (porCorreo.estado) {
        throw Object.assign(new Error('El correo ya está registrado'), { statusCode: 409 })
      }

      return clienteRepository.actualizar(porCorreo.id_cliente, {
        id_gimnasio: idGimnasio,
        nombre: dto.nombre,
        apellido: dto.apellido,
        cedula: dto.cedula,
        correo: dto.correo,
        telefono: dto.telefono,
        fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : undefined,
        estado: true,
      })
    }

    return clienteRepository.crear({
      id_gimnasio: idGimnasio,
      nombre: dto.nombre,
      apellido: dto.apellido,
      cedula: dto.cedula,
      correo: dto.correo,
      telefono: dto.telefono,
      fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : undefined,
    })
  },

  async buscarPorCedula(cedula: string, idGimnasio: bigint) {
    const cliente = await clienteRepository.buscarPorCedula(cedula)
    return (cliente && cliente.id_gimnasio === idGimnasio) ? cliente : null
  },

  async buscarPorNombre(termino: string, idGimnasio: bigint) {
    return clienteRepository.buscarPorNombre(termino, idGimnasio)
  },

  async actualizar(id: bigint, dto: ActualizarClienteDto, idGimnasio: bigint) {
    const cliente = await this.buscar(id, idGimnasio)

    if (dto.cedula && dto.cedula !== cliente.cedula) {
      const existente = await clienteRepository.buscarPorCedula(dto.cedula)
      if (existente) throw Object.assign(new Error('La cédula ya está registrada'), { statusCode: 409 })
    }

    return clienteRepository.actualizar(id, {
      ...dto,
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
