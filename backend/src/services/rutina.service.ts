import { prisma } from '../lib/prisma'
import { rutinaRepository } from '../repositories/rutina.repository'
import { notificationFactory } from './notification-factory.service'
import type { CrearRutinaDto, ActualizarRutinaDto, AsignarRutinaDto } from '../dtos/rutina.dto'
import type { RequestContext } from '../types/request-context'

const trainerId = (context: RequestContext) =>
  context.role === 'Entrenador' ? context.actorId : undefined

function noEncontrada(resource = 'Rutina'): never {
  throw Object.assign(new Error(`${resource} no encontrada`), { statusCode: 404 })
}

export const rutinaService = {
  listar(context: RequestContext) {
    return rutinaRepository.listarPorGimnasio(context.gymId, trainerId(context))
  },

  async obtener(id: bigint, context: RequestContext) {
    const rutina = await rutinaRepository.buscarPorId(id, context.gymId, trainerId(context))
    if (!rutina) noEncontrada()
    return rutina
  },

  crear(context: RequestContext, dto: CrearRutinaDto) {
    return prisma.$transaction(async (tx) => {
      const idsEjercicios = dto.ejercicios.map((e) => BigInt(e.id_ejercicio))
      const existentes = await tx.ejercicio.count({
        where: { id_ejercicio: { in: idsEjercicios }, id_gimnasio: context.gymId, estado: true },
      })
      if (existentes !== new Set(idsEjercicios.map(String)).size) {
        throw Object.assign(new Error('Uno o más ejercicios no existen o no pertenecen a este gimnasio'), { statusCode: 400 })
      }

      const rutina = await rutinaRepository.crear({
        id_gimnasio: context.gymId,
        id_usuario_creador: context.actorId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
      }, tx)

      await rutinaRepository.agregarEjercicios(rutina.id_rutina, dto.ejercicios.map((e) => ({
        id_ejercicio: BigInt(e.id_ejercicio),
        series: e.series,
        repeticiones: e.repeticiones,
        peso_sugerido: e.peso_sugerido,
      })), tx)

      // Un entrenador debe poder ver la rutina que acaba de crear.
      if (context.role === 'Entrenador') {
        await rutinaRepository.asignarEntrenador(rutina.id_rutina, context.actorId, tx)
      }

      return rutinaRepository.buscarPorId(rutina.id_rutina, context.gymId, trainerId(context), tx)
    })
  },

  actualizar(id: bigint, context: RequestContext, dto: ActualizarRutinaDto) {
    return prisma.$transaction(async (tx) => {
      const rutina = await rutinaRepository.buscarPorId(id, context.gymId, trainerId(context), tx)
      if (!rutina) noEncontrada()

      if (dto.nombre !== undefined || dto.descripcion !== undefined || dto.estado !== undefined) {
        await rutinaRepository.actualizar(id, {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          estado: dto.estado,
        }, tx)
      }

      if (dto.ejercicios) {
        const ids = dto.ejercicios.map((e) => BigInt(e.id_ejercicio))
        const existentes = await tx.ejercicio.count({
          where: { id_ejercicio: { in: ids }, id_gimnasio: context.gymId, estado: true },
        })
        if (existentes !== new Set(ids.map(String)).size) {
          throw Object.assign(new Error('Uno o más ejercicios no existen o no pertenecen a este gimnasio'), { statusCode: 400 })
        }
        await rutinaRepository.eliminarEjercicios(id, tx)
        await rutinaRepository.agregarEjercicios(id, dto.ejercicios.map((e) => ({
          id_ejercicio: BigInt(e.id_ejercicio),
          series: e.series,
          repeticiones: e.repeticiones,
          peso_sugerido: e.peso_sugerido,
        })), tx)
      }

      return rutinaRepository.buscarPorId(id, context.gymId, trainerId(context), tx)
    })
  },

  eliminar(id: bigint, context: RequestContext) {
    return prisma.$transaction(async (tx) => {
      const rutina = await rutinaRepository.buscarPorId(id, context.gymId, undefined, tx)
      if (!rutina) noEncontrada()
      await tx.clienteRutina.deleteMany({ where: { id_rutina: id } })
      await rutinaRepository.eliminarEjercicios(id, tx)
      return rutinaRepository.eliminar(id, tx)
    })
  },

  asignarEntrenador(idRutina: bigint, context: RequestContext, idEntrenador: bigint) {
    return prisma.$transaction(async (tx) => {
      const rutina = await rutinaRepository.buscarPorId(idRutina, context.gymId, undefined, tx)
      if (!rutina) noEncontrada()
      const entrenador = await tx.usuario.findFirst({
        where: { id_usuario: idEntrenador, id_gimnasio: context.gymId, rol: 'Entrenador', estado: true },
      })
      if (!entrenador) noEncontrada('Entrenador')
      const yaAsignado = await tx.rutinaEntrenador.findUnique({
        where: { id_rutina_id_entrenador: { id_rutina: idRutina, id_entrenador: idEntrenador } },
      })
      if (yaAsignado) {
        throw Object.assign(new Error('El entrenador ya tiene esta rutina asignada'), { statusCode: 409 })
      }
      return rutinaRepository.asignarEntrenador(idRutina, idEntrenador, tx)
    })
  },

  removerEntrenador(idRutina: bigint, context: RequestContext, idEntrenador: bigint) {
    return prisma.$transaction(async (tx) => {
      const rutina = await rutinaRepository.buscarPorId(idRutina, context.gymId, undefined, tx)
      if (!rutina) noEncontrada()
      return rutinaRepository.removerEntrenador(idRutina, idEntrenador, tx)
    })
  },

  async listarEntrenadoresAsignados(idRutina: bigint, context: RequestContext) {
    const rutina = await rutinaRepository.buscarPorId(idRutina, context.gymId)
    if (!rutina) noEncontrada()
    return rutinaRepository.listarEntrenadoresAsignados(idRutina, context.gymId)
  },

  asignarCliente(idRutina: bigint, context: RequestContext, dto: AsignarRutinaDto) {
    return prisma.$transaction(async (tx) => {
      const idEntrenador = trainerId(context)
      const rutina = await rutinaRepository.buscarPorId(idRutina, context.gymId, idEntrenador, tx)
      if (!rutina) noEncontrada()

      const idCliente = BigInt(dto.id_cliente)
      const cliente = await tx.cliente.findFirst({
        where: {
          id_cliente: idCliente,
          id_gimnasio: context.gymId,
          estado: true,
          ...(idEntrenador ? { id_entrenador: idEntrenador } : {}),
        },
      })
      if (!cliente) noEncontrada('Cliente')

      const duplicado = await rutinaRepository.buscarAsignacionActiva(idCliente, idRutina, context.gymId, tx)
      if (duplicado) {
        throw Object.assign(new Error('El cliente ya tiene esta rutina asignada'), { statusCode: 409 })
      }

      const fecha = dto.fecha_asignacion ? new Date(dto.fecha_asignacion) : new Date()
      fecha.setHours(0, 0, 0, 0)
      const asignacion = await tx.clienteRutina.create({
        data: {
          id_cliente: idCliente,
          id_rutina: idRutina,
          id_entrenador_asignador: idEntrenador,
          fecha_asignacion: fecha,
          estado: 'activa',
        },
      })

      const ejercicios = await tx.rutinaEjercicio.findMany({
        where: { id_rutina: idRutina },
        include: { ejercicio: { select: { nombre: true, grupo_muscular: true } } },
      })
      await tx.clienteRutinaEjercicio.createMany({
        data: ejercicios.map((re, index) => ({
          id_cliente_rutina: asignacion.id_cliente_rutina,
          id_ejercicio: re.id_ejercicio,
          nombre: re.ejercicio.nombre,
          grupo_muscular: re.ejercicio.grupo_muscular,
          series: re.series,
          repeticiones: re.repeticiones,
          peso: re.peso_sugerido,
          orden: index + 1,
        })),
      })
      await notificationFactory.crear({
        tipo: 'SISTEMA',
        destino: { id_cliente: idCliente },
        titulo: 'Rutina asignada',
        mensaje: `Se te ha asignado la rutina: ${rutina.nombre}`,
      }, tx)
      return asignacion
    })
  },

  async obtenerClienteRutina(idClienteRutina: bigint, context: RequestContext) {
    const asignacion = await rutinaRepository.buscarClienteRutina(
      idClienteRutina,
      context.gymId,
      trainerId(context),
    )
    if (!asignacion) noEncontrada('Asignación')
    return asignacion
  },

  actualizarEjercicioCliente(id: bigint, context: RequestContext, data: {
    series?: number
    repeticiones?: number
    peso?: number
    descanso?: number
    observaciones?: string
    estado?: boolean
  }) {
    return prisma.$transaction(async (tx) => {
      const ejercicio = await rutinaRepository.buscarEjercicioCliente(id, context.gymId, trainerId(context), tx)
      if (!ejercicio) noEncontrada('Ejercicio de asignación')
      return rutinaRepository.actualizarEjercicioCliente(id, data, tx)
    })
  },

  actualizarClienteRutina(idClienteRutina: bigint, context: RequestContext, data: {
    fecha_inicio?: string
    fecha_fin?: string
    observaciones?: string
    estado?: string
  }) {
    return prisma.$transaction(async (tx) => {
      const asignacion = await rutinaRepository.buscarClienteRutina(
        idClienteRutina,
        context.gymId,
        trainerId(context),
        tx,
      )
      if (!asignacion) noEncontrada('Asignación')
      return rutinaRepository.actualizarClienteRutina(idClienteRutina, {
        ...(data.fecha_inicio ? { fecha_inicio: new Date(data.fecha_inicio) } : {}),
        ...(data.fecha_fin ? { fecha_fin: new Date(data.fecha_fin) } : {}),
        observaciones: data.observaciones,
        estado: data.estado,
      }, tx)
    })
  },

  async listarRutinasDeCliente(idCliente: bigint, context: RequestContext) {
    const cliente = await prisma.cliente.findFirst({
      where: {
        id_cliente: idCliente,
        id_gimnasio: context.gymId,
        ...(trainerId(context) ? { id_entrenador: trainerId(context) } : {}),
      },
      select: { id_cliente: true },
    })
    if (!cliente) noEncontrada('Cliente')
    return rutinaRepository.listarRutinasDeCliente(idCliente, context.gymId, trainerId(context))
  },

  async listarAsignaciones(idRutina: bigint, context: RequestContext) {
    const rutina = await rutinaRepository.buscarPorId(idRutina, context.gymId, trainerId(context))
    if (!rutina) noEncontrada()
    return rutinaRepository.listarAsignaciones(idRutina, context.gymId, trainerId(context))
  },
}
