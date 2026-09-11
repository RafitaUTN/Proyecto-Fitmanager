/**
 * Servicio de programación de rutinas.
 *
 * @remarks Implementa sesiones programadas sin reemplazar las rutinas
 * flexibles existentes. Las validaciones de conflicto viven aquí porque son
 * reglas de negocio, no detalles de UI.
 */
import { prisma } from '../lib/prisma'
import type { Prisma } from '../generated/prisma/client'
import { AppError } from '../lib/errors'
import type { RequestContext } from '../types/request-context'
import type {
  ActualizarProgramacionRutinaDto,
  CrearProgramacionRutinaDto,
  ListarProgramacionesRutinaDto,
} from '../dtos/programacion-rutina.dto'
import { programacionRutinaInclude, programacionRutinaRepository } from '../repositories/programacion-rutina.repository'
import { notificationFactory } from './notification-factory.service'

function trainerId(context: RequestContext) {
  return context.role === 'Entrenador' ? context.actorId : undefined
}

function startOfDay(value: string): Date {
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) throw new AppError('Fecha inválida', 400, 'FECHA_INVALIDA')
  return d
}

function parseDateTime(value: string): Date {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new AppError('Hora inválida', 400, 'FECHA_INVALIDA')
  return d
}

function normalizeLevels(levels: string[] | undefined) {
  const unique = [...new Set(levels?.length ? levels : ['TODOS'])]
  return unique.includes('TODOS') ? ['TODOS'] : unique
}

function toBigIntSet(values: number[] | undefined) {
  return [...new Set((values || []).map((value) => BigInt(value)))]
}

function ensureStaffManager(context: RequestContext) {
  if (!['Administrador', 'Entrenador'].includes(context.role)) {
    throw new AppError('No autorizado para gestionar programaciones de rutinas', 403, 'FORBIDDEN')
  }
}

async function validarBase(
  context: RequestContext,
  input: {
    idRutina: bigint
    idEntrenador: bigint
    idsClientes: bigint[]
    inicio: Date
    fin: Date
    capacidad?: number
    excluirId?: bigint
  },
  tx: Prisma.TransactionClient,
) {
  if (input.fin <= input.inicio) throw new AppError('La hora fin debe ser posterior a la hora inicio', 400, 'RANGO_INVALIDO')
  if (input.capacidad && input.idsClientes.length > input.capacidad) {
    throw new AppError('La cantidad de clientes supera la capacidad de la sesión', 422, 'CAPACIDAD_EXCEDIDA')
  }
  if (context.role === 'Entrenador' && input.idEntrenador !== context.actorId) {
    throw new AppError('El entrenador solo puede programar sesiones para sí mismo', 403, 'FORBIDDEN')
  }

  const [rutina, entrenador, clientesValidos] = await Promise.all([
    tx.rutina.findFirst({
      where: { id_rutina: input.idRutina, id_gimnasio: context.gymId, estado: true },
      select: { id_rutina: true, nombre: true },
    }),
    tx.usuario.findFirst({
      where: { id_usuario: input.idEntrenador, id_gimnasio: context.gymId, rol: 'Entrenador', estado: true },
      select: { id_usuario: true, nombre: true, apellido: true },
    }),
    input.idsClientes.length
      ? tx.cliente.findMany({
          where: { id_cliente: { in: input.idsClientes }, id_gimnasio: context.gymId, estado: true },
          select: { id_cliente: true, nombre: true, apellido: true },
        })
      : Promise.resolve([]),
  ])

  if (!rutina) throw new AppError('Rutina no encontrada', 404, 'RESOURCE_NOT_ACCESSIBLE')
  if (!entrenador) throw new AppError('Entrenador no encontrado', 404, 'RESOURCE_NOT_ACCESSIBLE')
  if (clientesValidos.length !== input.idsClientes.length) {
    throw new AppError('Uno o más clientes no existen o no pertenecen a este gimnasio', 404, 'RESOURCE_NOT_ACCESSIBLE')
  }

  const [conflictoEntrenador, conflictoCliente] = await Promise.all([
    programacionRutinaRepository.conflictosEntrenador(
      context.gymId,
      input.idEntrenador,
      input.inicio,
      input.fin,
      input.excluirId,
      tx,
    ),
    programacionRutinaRepository.conflictosClientes(
      context.gymId,
      input.idsClientes,
      input.inicio,
      input.fin,
      input.excluirId,
      tx,
    ),
  ])
  if (conflictoEntrenador.length) {
    throw new AppError('El entrenador ya tiene una sesión en ese horario', 409, 'CONFLICTO_HORARIO_ENTRENADOR')
  }
  if (conflictoCliente.length) {
    throw new AppError('Uno de los clientes ya tiene una sesión en ese horario', 409, 'CONFLICTO_HORARIO_CLIENTE')
  }

  return { rutina, entrenador, clientesValidos }
}

export const programacionRutinaService = {
  async listar(context: RequestContext, filtros: ListarProgramacionesRutinaDto) {
    ensureStaffManager(context)
    const desde = startOfDay(filtros.desde)
    const hasta = startOfDay(filtros.hasta)
    hasta.setHours(23, 59, 59, 999)
    const scopedTrainer = trainerId(context)
    const idEntrenador = scopedTrainer ?? (filtros.id_entrenador ? BigInt(filtros.id_entrenador) : undefined)
    const { data, total } = await programacionRutinaRepository.listar(
      context.gymId,
      {
        desde,
        hasta,
        id_entrenador: idEntrenador,
        id_rutina: filtros.id_rutina ? BigInt(filtros.id_rutina) : undefined,
        nivel: filtros.nivel,
        estado: filtros.estado,
      },
      filtros.page,
      filtros.pageSize,
    )
    return { data, total, page: filtros.page, pageSize: filtros.pageSize, totalPages: Math.ceil(total / filtros.pageSize) }
  },

  async crear(context: RequestContext, dto: CrearProgramacionRutinaDto) {
    ensureStaffManager(context)
    const niveles = normalizeLevels(dto.niveles)
    const idsClientes = toBigIntSet(dto.clientes)
    const inicio = parseDateTime(dto.hora_inicio)
    const fin = parseDateTime(dto.hora_fin)
    const fecha = startOfDay(dto.fecha)

    return prisma.$transaction(
      async (tx) => {
        const base = await validarBase(
          context,
          {
            idRutina: BigInt(dto.id_rutina),
            idEntrenador: BigInt(dto.id_entrenador),
            idsClientes,
            inicio,
            fin,
            capacidad: dto.capacidad,
          },
          tx,
        )
        const sesion = await tx.programacionRutina.create({
          data: {
            id_gimnasio: context.gymId,
            id_rutina: BigInt(dto.id_rutina),
            id_entrenador: BigInt(dto.id_entrenador),
            fecha,
            hora_inicio: inicio,
            hora_fin: fin,
            capacidad: dto.capacidad,
            notas: dto.notas,
            niveles: { createMany: { data: niveles.map((nivel) => ({ nivel: nivel as any })) } },
            clientes: { createMany: { data: idsClientes.map((id_cliente) => ({ id_cliente })) } },
          },
        })
        for (const cliente of base.clientesValidos) {
          await notificationFactory.crear(
            {
              tipo: 'SISTEMA',
              destino: { id_cliente: cliente.id_cliente },
              titulo: 'Rutina programada',
              mensaje: `Tienes programada la rutina ${base.rutina.nombre}.`,
              accionUrl: '/cliente/rutinas',
            },
            tx,
          )
        }
        return programacionRutinaRepository.buscarPorId(sesion.id_programacion, context.gymId, tx)
      },
      { isolationLevel: 'Serializable' },
    )
  },

  async actualizar(id: bigint, context: RequestContext, dto: ActualizarProgramacionRutinaDto) {
    ensureStaffManager(context)
    const actual = await programacionRutinaRepository.buscarPorId(id, context.gymId)
    if (!actual) throw new AppError('Sesión no encontrada', 404, 'RESOURCE_NOT_ACCESSIBLE')
    if (actual.estado === 'CANCELADA') throw new AppError('No se puede editar una sesión cancelada', 422, 'SESION_CANCELADA')

    const idRutina = dto.id_rutina ? BigInt(dto.id_rutina) : actual.id_rutina
    const idEntrenador = dto.id_entrenador ? BigInt(dto.id_entrenador) : actual.id_entrenador
    const inicio = dto.hora_inicio ? parseDateTime(dto.hora_inicio) : actual.hora_inicio
    const fin = dto.hora_fin ? parseDateTime(dto.hora_fin) : actual.hora_fin
    const fecha = dto.fecha ? startOfDay(dto.fecha) : actual.fecha
    const idsClientes = dto.clientes ? toBigIntSet(dto.clientes) : actual.clientes.map((c) => c.id_cliente)
    const niveles = dto.niveles ? normalizeLevels(dto.niveles) : actual.niveles.map((n) => n.nivel)

    return prisma.$transaction(
      async (tx) => {
        const base = await validarBase(
          context,
          { idRutina, idEntrenador, idsClientes, inicio, fin, capacidad: dto.capacidad ?? actual.capacidad ?? undefined, excluirId: id },
          tx,
        )
        await tx.programacionRutina.update({
          where: { id_programacion: id },
          data: {
            id_rutina: idRutina,
            id_entrenador: idEntrenador,
            fecha,
            hora_inicio: inicio,
            hora_fin: fin,
            capacidad: dto.capacidad,
            notas: dto.notas,
          },
        })
        if (dto.niveles) {
          await tx.programacionRutinaNivel.deleteMany({ where: { id_programacion: id } })
          await tx.programacionRutinaNivel.createMany({ data: niveles.map((nivel) => ({ id_programacion: id, nivel: nivel as any })) })
        }
        if (dto.clientes) {
          await tx.programacionRutinaCliente.deleteMany({ where: { id_programacion: id, completada: false } })
          await tx.programacionRutinaCliente.createMany({
            data: idsClientes.map((id_cliente) => ({ id_programacion: id, id_cliente })),
            skipDuplicates: true,
          })
        }
        for (const cliente of base.clientesValidos) {
          await notificationFactory.crear(
            {
              tipo: 'SISTEMA',
              destino: { id_cliente: cliente.id_cliente },
              titulo: 'Horario de rutina actualizado',
              mensaje: `La sesión de ${base.rutina.nombre} fue actualizada.`,
              accionUrl: '/cliente/rutinas',
            },
            tx,
          )
        }
        return programacionRutinaRepository.buscarPorId(id, context.gymId, tx)
      },
      { isolationLevel: 'Serializable' },
    )
  },

  async cancelar(id: bigint, context: RequestContext, motivo?: string) {
    ensureStaffManager(context)
    const sesion = await prisma.programacionRutina.findFirst({
      where: { id_programacion: id, id_gimnasio: context.gymId },
      include: {
        rutina: { select: { nombre: true } },
        clientes: { select: { id_cliente: true } },
      },
    })
    if (!sesion) throw new AppError('Sesión no encontrada', 404, 'RESOURCE_NOT_ACCESSIBLE')
    if (context.role === 'Entrenador' && sesion.id_entrenador !== context.actorId) {
      throw new AppError('El entrenador solo puede cancelar sus propias sesiones', 403, 'FORBIDDEN')
    }
    if (sesion.estado === 'CANCELADA') throw new AppError('La sesión ya fue cancelada', 409, 'SESION_CANCELADA')
    await prisma.$transaction(async (tx) => {
      await tx.programacionRutina.update({
        where: { id_programacion: id },
        data: { estado: 'CANCELADA', cancelada_en: new Date(), cancelada_por: context.actorId, motivo_cancelacion: motivo },
      })
      for (const cliente of sesion.clientes) {
        await notificationFactory.crear(
          {
            tipo: 'SISTEMA',
            destino: { id_cliente: cliente.id_cliente },
            titulo: 'Rutina cancelada',
            mensaje: `La sesión de ${sesion.rutina.nombre} fue cancelada.${motivo ? ` Motivo: ${motivo}` : ''}`,
            accionUrl: '/cliente/rutinas',
          },
          tx,
        )
      }
    })
    return { ok: true }
  },

  async calendarioCliente(context: RequestContext, desde: string, hasta: string) {
    if (context.actorType !== 'CLIENTE') throw new AppError('Solo clientes', 403, 'FORBIDDEN')
    const inicio = startOfDay(desde)
    const fin = startOfDay(hasta)
    fin.setHours(23, 59, 59, 999)
    const cliente = await prisma.cliente.findFirst({
      where: { id_cliente: context.actorId, id_gimnasio: context.gymId, estado: true },
      select: { nivel: true },
    })
    if (!cliente) throw new AppError('Cliente no encontrado', 404, 'RESOURCE_NOT_ACCESSIBLE')
    return prisma.programacionRutina.findMany({
      where: {
        id_gimnasio: context.gymId,
        fecha: { gte: inicio, lte: fin },
        estado: { not: 'CANCELADA' },
        OR: [
          { clientes: { some: { id_cliente: context.actorId } } },
          { niveles: { some: { nivel: 'TODOS' } } },
          { niveles: { some: { nivel: cliente.nivel as any } } },
        ],
      },
      include: programacionRutinaInclude,
      orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }],
    })
  },

  async completarCliente(context: RequestContext, idProgramacion: bigint) {
    if (context.actorType !== 'CLIENTE') throw new AppError('Solo clientes', 403, 'FORBIDDEN')
    const ahora = new Date()
    return prisma.$transaction(async (tx) => {
      const sesion = await tx.programacionRutina.findFirst({
        where: { id_programacion: idProgramacion, id_gimnasio: context.gymId },
        include: { clientes: true, niveles: true },
      })
      if (!sesion) throw new AppError('Sesión no encontrada', 404, 'RESOURCE_NOT_ACCESSIBLE')
      if (sesion.estado === 'CANCELADA') throw new AppError('No se puede completar una sesión cancelada', 422, 'SESION_CANCELADA')
      if (sesion.hora_inicio > ahora) throw new AppError('No se puede completar una sesión futura', 422, 'SESION_FUTURA')
      const cliente = await tx.cliente.findFirst({
        where: { id_cliente: context.actorId, id_gimnasio: context.gymId, estado: true },
        select: { nivel: true },
      })
      if (!cliente) throw new AppError('Cliente no encontrado', 404, 'RESOURCE_NOT_ACCESSIBLE')
      const estaAsignado = sesion.clientes.some((c) => c.id_cliente === context.actorId)
      const nivelPermitido = sesion.niveles.some((n) => n.nivel === 'TODOS' || n.nivel === cliente.nivel)
      if (!estaAsignado && !nivelPermitido) {
        throw new AppError('No tienes asignada esta sesión', 403, 'FORBIDDEN')
      }
      const existente = await tx.programacionRutinaCliente.findUnique({
        where: { id_programacion_id_cliente: { id_programacion: idProgramacion, id_cliente: context.actorId } },
      })
      if (existente) {
        await tx.programacionRutinaCliente.update({
          where: { id_programacion_cliente: existente.id_programacion_cliente },
          data: { completada: true, completada_en: ahora },
        })
      } else {
        await tx.programacionRutinaCliente.create({
          data: { id_programacion: idProgramacion, id_cliente: context.actorId, completada: true, completada_en: ahora },
        })
      }
      return { ok: true, completada_en: ahora }
    })
  },
}
