/**
 * Servicio de negocio del módulo asistencia.service.
 *
 * @remarks Contiene reglas del dominio FitManager y coordina repositorios, transacciones y efectos secundarios.
 */
import { asistenciaRepository } from '../repositories/asistencia.repository'
import { prisma } from '../lib/prisma'
import type { RegistrarEntradaDto, RegistrarSalidaDto, ListarAsistenciasDto } from '../dtos/asistencia.dto'
import { AppError } from '../lib/errors'
import { dashboardService } from './dashboard.service'
import type { RequestContext } from '../types/request-context'

export const asistenciaService = {
  /**
   * Lista el historial de asistencias con filtros normalizados por día.
   *
   * @param idGimnasio - Gimnasio dueño del historial.
   * @param filtros - Cliente, rango de fechas, estado dentro/fuera y paginación.
   * @param idEntrenador - Entrenador opcional para limitar a sus clientes.
   * @returns Página de asistencias y metadatos de paginación.
   */
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
    return {
      data,
      total,
      pagina: filtros.pagina,
      limite: filtros.limite,
      totalPaginas: Math.ceil(total / filtros.limite),
    }
  },

  /**
   * Registra la entrada de un cliente al gimnasio.
   *
   * Valida que el cliente pertenezca al gimnasio, esté activo, tenga membresía
   * vigente y no posea una entrada abierta. La transacción protege contra doble
   * entrada cuando dos recepcionistas registran al mismo cliente a la vez.
   *
   * @param idGimnasio - Gimnasio donde ocurre la asistencia.
   * @param dto - Cliente que ingresa.
   * @returns Registro de asistencia abierto.
   */
  async registrarEntrada(idGimnasio: bigint, dto: RegistrarEntradaDto, origen: 'STAFF' | 'CLIENTE' = 'STAFF') {
    const idCliente = BigInt(dto.id_cliente)
    const ahora = new Date()
    const fecha = new Date(ahora)
    fecha.setHours(0, 0, 0, 0)

    try {
      const asistencia = await prisma.$transaction(async (tx) => {
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
        return asistenciaRepository.crear(
          {
            id_gimnasio: idGimnasio,
            id_cliente: idCliente,
            fecha_hora_ingreso: ahora,
            origen,
          },
          tx,
        )
      })
      dashboardService.invalidar(idGimnasio)
      return asistencia
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw Object.assign(new Error('El cliente ya tiene una entrada registrada sin salida'), { statusCode: 409 })
      }
      throw error
    }
  },

  async registrarEntradaCliente(context: RequestContext) {
    if (context.actorType !== 'CLIENTE') throw new AppError('Solo clientes', 403, 'FORBIDDEN')
    return this.registrarEntrada(context.gymId, { id_cliente: Number(context.actorId), metodo: 'manual' }, 'CLIENTE')
  },

  async asistenciaActualCliente(context: RequestContext) {
    if (context.actorType !== 'CLIENTE') throw new AppError('Solo clientes', 403, 'FORBIDDEN')
    return asistenciaRepository.buscarEntradaAbierta(context.actorId, context.gymId)
  },

  async registrarSalidaCliente(context: RequestContext) {
    if (context.actorType !== 'CLIENTE') throw new AppError('Solo clientes', 403, 'FORBIDDEN')
    const abierta = await asistenciaRepository.buscarEntradaAbierta(context.actorId, context.gymId)
    if (!abierta) throw new AppError('No tienes una entrada abierta', 409, 'ATTENDANCE_NOT_OPEN')
    return this.registrarSalida(context.gymId, { id_asistencia: Number(abierta.id_asistencia) })
  },

  /**
   * Cierra una entrada de asistencia pendiente.
   *
   * Actualiza la salida solo si el registro sigue abierto, por eso es seguro
   * frente a dobles clics o solicitudes concurrentes sobre la misma asistencia.
   *
   * @param idGimnasio - Gimnasio dueño del registro.
   * @param dto - Identificador de asistencia a cerrar.
   * @returns Asistencia actualizada con hora de salida.
   */
  async registrarSalida(idGimnasio: bigint, dto: RegistrarSalidaDto) {
    const idAsistencia = BigInt(dto.id_asistencia)
    const salida = await prisma.$transaction(async (tx) => {
      const asistencia = await asistenciaRepository.buscarPorId(idAsistencia, idGimnasio, tx)
      if (!asistencia) throw new AppError('Registro de asistencia no encontrado', 404, 'RESOURCE_NOT_ACCESSIBLE')
      if (asistencia.fecha_hora_salida)
        throw new AppError('Esta entrada ya tiene una salida registrada', 409, 'ATTENDANCE_ALREADY_CLOSED')
      const actualizado = await asistenciaRepository.actualizarSalidaSiAbierta(idAsistencia, idGimnasio, new Date(), tx)
      if (actualizado.count !== 1)
        throw new AppError('Esta entrada ya tiene una salida registrada', 409, 'ATTENDANCE_ALREADY_CLOSED')
      const resultado = await asistenciaRepository.buscarPorId(idAsistencia, idGimnasio, tx)
      console.info(
        JSON.stringify({
          level: 'info',
          event: 'business_audit',
          action: 'ATTENDANCE_EXIT',
          attendanceId: idAsistencia.toString(),
          gymId: idGimnasio.toString(),
        }),
      )
      return resultado
    })
    dashboardService.invalidar(idGimnasio)
    return salida
  },

  async listarActivas(idGimnasio: bigint) {
    const asistencias = await asistenciaRepository.listarActivas(idGimnasio)
    const clientes = asistencias.map((asistencia) => asistencia.cliente).filter(Boolean)
    if (clientes.length === 0) {
      return asistencias.map((asistencia) => ({ ...asistencia, rutina_programada: null }))
    }

    const ahora = new Date()
    const inicioDia = new Date(ahora)
    inicioDia.setHours(0, 0, 0, 0)
    const finDia = new Date(inicioDia)
    finDia.setHours(23, 59, 59, 999)

    const idsClientes = clientes.map((cliente) => cliente.id_cliente)
    const niveles = Array.from(new Set(clientes.map((cliente) => cliente.nivel)))
    const sesiones = await prisma.programacionRutina.findMany({
      where: {
        id_gimnasio: idGimnasio,
        estado: { in: ['PROGRAMADA', 'EN_CURSO'] },
        fecha: { gte: inicioDia, lte: finDia },
        hora_fin: { gte: ahora },
        OR: [
          { clientes: { some: { id_cliente: { in: idsClientes } } } },
          { niveles: { some: { nivel: 'TODOS' } } },
          { niveles: { some: { nivel: { in: niveles } } } },
        ],
      },
      include: {
        rutina: { select: { id_rutina: true, nombre: true } },
        entrenador: { select: { id_usuario: true, nombre: true, apellido: true } },
        clientes: { select: { id_cliente: true } },
        niveles: { select: { nivel: true } },
      },
      orderBy: { hora_inicio: 'asc' },
    })

    return asistencias.map((asistencia) => {
      const cliente = asistencia.cliente
      const sesion = sesiones.find((programacion) => {
        const asignadaDirectamente = programacion.clientes.some((asignacion) => asignacion.id_cliente === cliente.id_cliente)
        const coincideNivel = programacion.niveles.some((nivel) => nivel.nivel === 'TODOS' || nivel.nivel === cliente.nivel)
        return asignadaDirectamente || coincideNivel
      })

      return {
        ...asistencia,
        rutina_programada: sesion
          ? {
              id_programacion: sesion.id_programacion,
              nombre: sesion.rutina.nombre,
              hora_inicio: sesion.hora_inicio,
              hora_fin: sesion.hora_fin,
              estado: sesion.estado,
              entrenador: sesion.entrenador,
            }
          : null,
      }
    })
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
