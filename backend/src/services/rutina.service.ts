import { prisma } from '../lib/prisma'
import { rutinaRepository } from '../repositories/rutina.repository'
import { ejercicioRepository } from '../repositories/ejercicio.repository'
import { clienteRepository } from '../repositories/cliente.repository'
import { notificationFactory } from './notification-factory.service'
import type { CrearRutinaDto, ActualizarRutinaDto, AsignarRutinaDto } from '../dtos/rutina.dto'

function validarEjercicios(ids: bigint[], idGimnasio: bigint) {
  return ejercicioRepository.listarPorIds(ids, idGimnasio)
}

export const rutinaService = {
  async listar(idGimnasio: bigint, idEntrenador?: bigint) {
    return rutinaRepository.listarPorGimnasio(idGimnasio, idEntrenador)
  },

  async obtener(id: bigint, idGimnasio: bigint) {
    const rutina = await rutinaRepository.buscarPorId(id)
    if (!rutina) {
      throw Object.assign(new Error('Rutina no encontrada'), { statusCode: 404 })
    }
    if (rutina.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Rutina no encontrada'), { statusCode: 404 })
    }
    return rutina
  },

  async crear(idGimnasio: bigint, idUsuarioCreador: bigint, dto: CrearRutinaDto) {
    const idsEjercicios = dto.ejercicios.map((e) => BigInt(e.id_ejercicio))
    const existentes = await validarEjercicios(idsEjercicios, idGimnasio)
    if (existentes.length !== idsEjercicios.length) {
      throw Object.assign(new Error('Uno o más ejercicios no existen o no pertenecen a este gimnasio'), { statusCode: 400 })
    }

    return prisma.$transaction(async (tx) => {
      const rutina = await prisma.rutina.create({
        data: {
          id_gimnasio: idGimnasio,
          id_usuario_creador: idUsuarioCreador,
          nombre: dto.nombre,
          descripcion: dto.descripcion,
        },
      })

      await prisma.rutinaEjercicio.createMany({
        data: dto.ejercicios.map((e) => ({
          id_rutina: rutina.id_rutina,
          id_ejercicio: BigInt(e.id_ejercicio),
          series: e.series,
          repeticiones: e.repeticiones,
          peso_sugerido: e.peso_sugerido,
        })),
      })

      return prisma.rutina.findUnique({
        where: { id_rutina: rutina.id_rutina },
        include: {
          creador: { select: { id_usuario: true, nombre: true, apellido: true } },
          entrenadores: { include: { entrenador: { select: { id_usuario: true, nombre: true, apellido: true } } } },
          rutina_ejercicios: { include: { ejercicio: true } },
        },
      })
    })
  },

  async actualizar(id: bigint, idGimnasio: bigint, dto: ActualizarRutinaDto) {
    const rutina = await rutinaRepository.buscarPorId(id)
    if (!rutina) {
      throw Object.assign(new Error('Rutina no encontrada'), { statusCode: 404 })
    }
    if (rutina.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Rutina no encontrada'), { statusCode: 404 })
    }

    return prisma.$transaction(async (tx) => {
      if (dto.nombre !== undefined || dto.descripcion !== undefined || dto.estado !== undefined) {
        await prisma.rutina.update({
          where: { id_rutina: id },
          data: { nombre: dto.nombre, descripcion: dto.descripcion, estado: dto.estado },
        })
      }

      if (dto.ejercicios) {
        const idsEjercicios = dto.ejercicios.map((e) => BigInt(e.id_ejercicio))
        const existentes = await validarEjercicios(idsEjercicios, idGimnasio)
        if (existentes.length !== idsEjercicios.length) {
          throw Object.assign(new Error('Uno o más ejercicios no existen'), { statusCode: 400 })
        }

        await prisma.rutinaEjercicio.deleteMany({ where: { id_rutina: id } })
        await prisma.rutinaEjercicio.createMany({
          data: dto.ejercicios.map((e) => ({
            id_rutina: id,
            id_ejercicio: BigInt(e.id_ejercicio),
            series: e.series,
            repeticiones: e.repeticiones,
            peso_sugerido: e.peso_sugerido,
          })),
        })
      }

      return prisma.rutina.findUnique({
        where: { id_rutina: id },
        include: {
          creador: { select: { id_usuario: true, nombre: true, apellido: true } },
          entrenadores: { include: { entrenador: { select: { id_usuario: true, nombre: true, apellido: true } } } },
          rutina_ejercicios: { include: { ejercicio: true } },
        },
      })
    })
  },

  async eliminar(id: bigint, idGimnasio: bigint) {
    const rutina = await rutinaRepository.buscarPorId(id)
    if (!rutina) {
      throw Object.assign(new Error('Rutina no encontrada'), { statusCode: 404 })
    }
    if (rutina.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Rutina no encontrada'), { statusCode: 404 })
    }

    return prisma.$transaction(async (tx) => {
      await prisma.rutinaEjercicio.deleteMany({ where: { id_rutina: id } })
      await prisma.clienteRutina.deleteMany({ where: { id_rutina: id } })
      return prisma.rutina.delete({ where: { id_rutina: id } })
    })
  },

  async asignarEntrenador(idRutina: bigint, idGimnasio: bigint, idEntrenador: bigint) {
    const rutina = await rutinaRepository.buscarPorId(idRutina)
    if (!rutina) {
      throw Object.assign(new Error('Rutina no encontrada'), { statusCode: 404 })
    }
    if (rutina.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Rutina no encontrada'), { statusCode: 404 })
    }

    const entrenador = await prisma.usuario.findUnique({ where: { id_usuario: idEntrenador } })
    if (!entrenador || entrenador.rol !== 'Entrenador') {
      throw Object.assign(new Error('Entrenador no válido'), { statusCode: 404 })
    }
    if (entrenador.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Entrenador no válido'), { statusCode: 404 })
    }

    const yaAsignado = await prisma.rutinaEntrenador.findUnique({
      where: { id_rutina_id_entrenador: { id_rutina: idRutina, id_entrenador: idEntrenador } },
    })
    if (yaAsignado) {
      throw Object.assign(new Error('El entrenador ya tiene esta rutina asignada'), { statusCode: 409 })
    }

    return rutinaRepository.asignarEntrenador(idRutina, idEntrenador)
  },

  async removerEntrenador(idRutina: bigint, idGimnasio: bigint, idEntrenador: bigint) {
    const rutina = await rutinaRepository.buscarPorId(idRutina)
    if (!rutina) {
      throw Object.assign(new Error('Rutina no encontrada'), { statusCode: 404 })
    }
    if (rutina.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Rutina no encontrada'), { statusCode: 404 })
    }
    return rutinaRepository.removerEntrenador(idRutina, idEntrenador)
  },

  async listarEntrenadoresAsignados(idRutina: bigint) {
    return rutinaRepository.listarEntrenadoresAsignados(idRutina)
  },

  async asignarCliente(idRutina: bigint, idGimnasio: bigint, dto: AsignarRutinaDto, idEntrenadorAsignador?: bigint) {
    const rutina = await rutinaRepository.buscarPorId(idRutina)
    if (!rutina) {
      throw Object.assign(new Error('Rutina no encontrada'), { statusCode: 404 })
    }

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

    // Trainer can only assign to their own clients
    if (idEntrenadorAsignador && cliente.id_entrenador !== idEntrenadorAsignador) {
      throw Object.assign(new Error('Solo puedes asignar rutinas a tus propios clientes'), { statusCode: 403 })
    }

    const duplicado = await rutinaRepository.buscarAsignacionActiva(idCliente, idRutina)
    if (duplicado) {
      throw Object.assign(new Error('El cliente ya tiene esta rutina asignada'), { statusCode: 409 })
    }

    const fecha = dto.fecha_asignacion ? new Date(dto.fecha_asignacion) : new Date()
    fecha.setHours(0, 0, 0, 0)

    // Create ClienteRutina + snapshot of all exercises in a transaction
    return prisma.$transaction(async (tx) => {
      const asignacion = await prisma.clienteRutina.create({
        data: {
          id_cliente: idCliente,
          id_rutina: idRutina,
          id_entrenador_asignador: idEntrenadorAsignador,
          fecha_asignacion: fecha,
          estado: 'activa',
        },
      })

      const ejercicios = await prisma.rutinaEjercicio.findMany({
        where: { id_rutina: idRutina },
        include: { ejercicio: { select: { nombre: true, grupo_muscular: true } } },
      })
      await prisma.clienteRutinaEjercicio.createMany({
        data: ejercicios.map((re, i) => ({
          id_cliente_rutina: asignacion.id_cliente_rutina,
          id_ejercicio: re.id_ejercicio,
          nombre: re.ejercicio.nombre,
          grupo_muscular: re.ejercicio.grupo_muscular,
          series: re.series,
          repeticiones: re.repeticiones,
          peso: re.peso_sugerido,
          orden: i + 1,
        })),
      })

      await notificationFactory.crear({
        tipo: 'SISTEMA',
        destino: { id_cliente: idCliente, id_gimnasio: idGimnasio },
        titulo: 'Rutina asignada',
        mensaje: `Se te ha asignado la rutina: ${rutina.nombre}`,
      })

      return asignacion
    })
  },

  async obtenerClienteRutina(idClienteRutina: bigint) {
    const cr = await rutinaRepository.buscarClienteRutina(idClienteRutina)
    if (!cr) {
      throw Object.assign(new Error('Asignación no encontrada'), { statusCode: 404 })
    }
    return cr
  },

  async actualizarEjercicioCliente(id: bigint, data: {
    series?: number
    repeticiones?: number
    peso?: number
    descanso?: number
    observaciones?: string
    estado?: boolean
  }) {
    return rutinaRepository.actualizarEjercicioCliente(BigInt(id), data)
  },

  async actualizarClienteRutina(idClienteRutina: bigint, data: {
    fecha_inicio?: string
    fecha_fin?: string
    observaciones?: string
    estado?: string
  }) {
    return rutinaRepository.actualizarClienteRutina(idClienteRutina, {
      ...(data.fecha_inicio ? { fecha_inicio: new Date(data.fecha_inicio) } : {}),
      ...(data.fecha_fin ? { fecha_fin: new Date(data.fecha_fin) } : {}),
      observaciones: data.observaciones,
      estado: data.estado,
    })
  },

  async listarRutinasDeCliente(idCliente: bigint) {
    return rutinaRepository.listarRutinasDeCliente(idCliente)
  },

  async listarAsignaciones(idRutina: bigint) {
    return rutinaRepository.listarAsignaciones(idRutina)
  },
}
