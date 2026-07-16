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
    if (existente) throw Object.assign(new Error('La cédula ya está registrada'), { statusCode: 409 })

    const porCorreo = await clienteRepository.buscarPorCorreo(dto.correo)
    if (porCorreo) throw Object.assign(new Error('El correo ya está registrado'), { statusCode: 409 })

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
}
