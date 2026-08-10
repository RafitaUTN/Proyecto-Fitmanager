import { asistenciaRepository } from '../repositories/asistencia.repository'
import { prisma } from '../lib/prisma'
import type { RegistrarEntradaDto, RegistrarSalidaDto, ListarAsistenciasDto } from '../dtos/asistencia.dto'
import { AppError } from '../lib/errors'

export const asistenciaService = {
  async listar(idGimnasio: bigint, filtros: ListarAsistenciasDto, idEntrenador?: bigint) {
    const fechaInicio = filtros.fecha_inicio ? new Date(filtros.fecha_inicio) : undefined
    const fechaFin = filtros.fecha_fin ? new Date(filtros.fecha_fin) : undefined
    const idCliente = filtros.id_cliente ? BigInt(filtros.id_cliente) : undefined
    if (fechaInicio) fechaInicio.setHours(0, 0, 0, 0)
    if (fechaFin) fechaFin.setHours(23, 59, 59, 999)
    const filtroRepo = {
      id_cliente: idCliente,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      solo_dentro: filtros.solo_dentro,
      id_entrenador: idEntrenador,
    }
    const [data, total] = await Promise.all([
      asistenciaRepository.listarPorGimnasio(idGimnasio, filtroRepo, filtros.pagina, filtros.limite),
      asistenciaRepository.contarPorGimnasio(idGimnasio, filtroRepo),
    ])
    return { data, total, pagina: filtros.pagina, limite: filtros.limite, totalPaginas: Math.ceil(total / filtros.limite) }
  },

  async registrarEntrada(idGimnasio: bigint, dto: RegistrarEntradaDto) {
    const idCliente = BigInt(dto.id_cliente)
    const ahora = new Date()
    const fecha = new Date(ahora)
    fecha.setHours(0, 0, 0, 0)

    try {
      return await prisma.$transaction(async (tx) => {
        const cliente = await tx.cliente.findFirst({
          where: { id_cliente: idCliente, id_gimnasio: idGimnasio, estado: true },
          select: { id_cliente: true },
        })
        if (!cliente) throw Object.assign(new Error('Cliente no encontrado o inactivo'), { statusCode: 404 })

        const membresiaActiva = await tx.clienteMembresia.findFirst({
          where: {
            id_cliente: idCliente,
            estado: 'activo',
            fecha_inicio: { lte: fecha },
            fecha_fin: { gte: fecha },
          },
          select: { id_cliente_membresia: true },
        })
        if (!membresiaActiva) {
          throw Object.assign(new Error('El cliente no tiene una membresía vigente'), { statusCode: 400 })
        }

        const yaAdentro = await asistenciaRepository.buscarEntradaAbierta(idCliente, idGimnasio, tx)
        if (yaAdentro) {
          throw Object.assign(new Error('El cliente ya tiene una entrada registrada sin salida'), { statusCode: 409 })
        }
        return asistenciaRepository.crear({
          id_gimnasio: idGimnasio,
          id_cliente: idCliente,
          fecha_hora_ingreso: ahora,
        }, tx)
      })
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw Object.assign(new Error('El cliente ya tiene una entrada registrada sin salida'), { statusCode: 409 })
      }
      throw error
    }
  },

  async registrarSalida(idGimnasio: bigint, dto: RegistrarSalidaDto) {
    const idAsistencia = BigInt(dto.id_asistencia)
    return prisma.$transaction(async (tx) => {
      const asistencia = await asistenciaRepository.buscarPorId(idAsistencia, idGimnasio, tx)
      if (!asistencia) throw new AppError('Registro de asistencia no encontrado', 404, 'RESOURCE_NOT_ACCESSIBLE')
      if (asistencia.fecha_hora_salida) throw new AppError('Esta entrada ya tiene una salida registrada', 409, 'ATTENDANCE_ALREADY_CLOSED')
      const actualizado = await asistenciaRepository.actualizarSalidaSiAbierta(idAsistencia, idGimnasio, new Date(), tx)
      if (actualizado.count !== 1) throw new AppError('Esta entrada ya tiene una salida registrada', 409, 'ATTENDANCE_ALREADY_CLOSED')
      const resultado = await asistenciaRepository.buscarPorId(idAsistencia, idGimnasio, tx)
      console.info(JSON.stringify({ level: 'info', event: 'business_audit', action: 'ATTENDANCE_EXIT', attendanceId: idAsistencia.toString(), gymId: idGimnasio.toString() }))
      return resultado
    })
  },

  listarActivas(idGimnasio: bigint) {
    return asistenciaRepository.listarActivas(idGimnasio)
  },

  listarElegibles(idGimnasio: bigint) {
    return asistenciaRepository.listarElegibles(idGimnasio)
  },

  async listarHoy(idGimnasio: bigint) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const finDelDia = new Date(hoy)
    finDelDia.setHours(23, 59, 59, 999)
    return asistenciaRepository.listarPorGimnasio(idGimnasio, { fecha_inicio: hoy, fecha_fin: finDelDia }, 1, 200)
  },
}
