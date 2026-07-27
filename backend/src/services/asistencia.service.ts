import { asistenciaRepository } from '../repositories/asistencia.repository'
import { clienteRepository } from '../repositories/cliente.repository'
import { clienteMembresiaRepository } from '../repositories/cliente-membresia.repository'
import type { RegistrarEntradaDto, RegistrarSalidaDto, ListarAsistenciasDto } from '../dtos/asistencia.dto'

export const asistenciaService = {
  async listar(idGimnasio: bigint, filtros: ListarAsistenciasDto, idEntrenador?: bigint) {
    const fechaInicio = filtros.fecha_inicio ? new Date(filtros.fecha_inicio) : undefined
    const fechaFin = filtros.fecha_fin ? new Date(filtros.fecha_fin) : undefined
    const idCliente = filtros.id_cliente ? BigInt(filtros.id_cliente) : undefined

    if (fechaInicio) fechaInicio.setHours(0, 0, 0, 0)
    if (fechaFin) fechaFin.setHours(23, 59, 59, 999)

    const [data, total] = await Promise.all([
      asistenciaRepository.listarPorGimnasio(
        idGimnasio,
        { id_cliente: idCliente, fecha_inicio: fechaInicio, fecha_fin: fechaFin, solo_dentro: filtros.solo_dentro, id_entrenador: idEntrenador },
        filtros.pagina,
        filtros.limite,
      ),
      asistenciaRepository.contarPorGimnasio(
        idGimnasio,
        { id_cliente: idCliente, fecha_inicio: fechaInicio, fecha_fin: fechaFin, solo_dentro: filtros.solo_dentro, id_entrenador: idEntrenador },
      ),
    ])

    return {
      data,
      total,
      pagina: filtros.pagina,
      limite: filtros.limite,
      totalPaginas: Math.ceil(total / filtros.limite),
    }
  },

  async registrarEntrada(idGimnasio: bigint, dto: RegistrarEntradaDto) {
    const idCliente = BigInt(dto.id_cliente)
    const cliente = await clienteRepository.buscarPorId(idCliente)
    if (!cliente) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }
    if (cliente.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }
    if (!cliente.estado) {
      throw Object.assign(new Error('Cliente inactivo'), { statusCode: 400 })
    }

    const membresiaActiva = await clienteMembresiaRepository.listarActivaPorCliente(idCliente)
    if (!membresiaActiva) {
      throw Object.assign(new Error('El cliente no tiene una membresía activa'), { statusCode: 400 })
    }

    const yaAdentro = await asistenciaRepository.buscarEntradaHoy(idCliente)
    if (yaAdentro) {
      throw Object.assign(new Error('El cliente ya tiene una entrada registrada sin salida'), { statusCode: 409 })
    }

    return asistenciaRepository.crear({
      id_cliente: idCliente,
      fecha_hora_ingreso: new Date(),
    })
  },

  async registrarSalida(idGimnasio: bigint, dto: RegistrarSalidaDto) {
    const idAsistencia = BigInt(dto.id_asistencia)
    const asistencia = await asistenciaRepository.buscarPorId(idAsistencia)
    if (!asistencia) {
      throw Object.assign(new Error('Registro de asistencia no encontrado'), { statusCode: 404 })
    }
    if (asistencia.cliente.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Registro de asistencia no encontrado'), { statusCode: 404 })
    }
    if (asistencia.fecha_hora_salida) {
      throw Object.assign(new Error('Esta entrada ya tiene una salida registrada'), { statusCode: 409 })
    }

    return asistenciaRepository.actualizarSalida(idAsistencia, new Date())
  },

  async listarHoy(idGimnasio: bigint) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const finDelDia = new Date(hoy)
    finDelDia.setHours(23, 59, 59, 999)

    return asistenciaRepository.listarPorGimnasio(
      idGimnasio,
      { fecha_inicio: hoy, fecha_fin: finDelDia },
      1,
      200,
    )
  },
}
