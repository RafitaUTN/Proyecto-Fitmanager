import { clienteMembresiaRepository } from '../repositories/cliente-membresia.repository'
import { membresiaRepository } from '../repositories/membresia.repository'
import { clienteRepository } from '../repositories/cliente.repository'
import type { AsignarMembresiaDto } from '../dtos/cliente-membresia.dto'

export const clienteMembresiaService = {
  async listarPorCliente(idCliente: bigint, idGimnasio: bigint) {
    const cliente = await clienteRepository.buscarPorId(idCliente)
    if (!cliente || cliente.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }
    return clienteMembresiaRepository.listarPorCliente(idCliente)
  },

  async listarTodas(idGimnasio: bigint) {
    return clienteMembresiaRepository.listarPorGimnasio(idGimnasio)
  },

  async asignar(idGimnasio: bigint, dto: AsignarMembresiaDto) {
    const cliente = await clienteRepository.buscarPorId(BigInt(dto.id_cliente))
    if (!cliente || cliente.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }

    const membresia = await membresiaRepository.buscarPorId(BigInt(dto.id_membresia))
    if (!membresia || membresia.id_gimnasio !== idGimnasio || !membresia.estado) {
      throw Object.assign(new Error('Membresía no válida'), { statusCode: 404 })
    }

    const fechaInicio = new Date(dto.fecha_inicio)
    const fechaFin = new Date(fechaInicio)
    fechaFin.setDate(fechaFin.getDate() + membresia.duracion_dias)

    return clienteMembresiaRepository.crear({
      id_cliente: BigInt(dto.id_cliente),
      id_membresia: BigInt(dto.id_membresia),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: 'activo',
    })
  },

  async renovar(idClienteMembresia: bigint, idGimnasio: bigint) {
    const actual = await clienteMembresiaRepository.buscarPorId(idClienteMembresia)
    if (!actual) {
      throw Object.assign(new Error('Asignación no encontrada'), { statusCode: 404 })
    }

    const membresia = await membresiaRepository.buscarPorId(actual.id_membresia)
    if (!membresia || membresia.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Membresía no válida'), { statusCode: 404 })
    }

    const nuevaFechaInicio = actual.fecha_fin
    const nuevaFechaFin = new Date(nuevaFechaInicio)
    nuevaFechaFin.setDate(nuevaFechaFin.getDate() + membresia.duracion_dias)

    return clienteMembresiaRepository.crear({
      id_cliente: actual.id_cliente,
      id_membresia: actual.id_membresia,
      fecha_inicio: nuevaFechaInicio,
      fecha_fin: nuevaFechaFin,
      estado: 'activo',
    })
  },
}
