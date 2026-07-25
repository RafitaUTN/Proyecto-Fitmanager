import { prisma } from '../lib/prisma'
import { rutinaRepository } from '../repositories/rutina.repository'
import { ejercicioRepository } from '../repositories/ejercicio.repository'
import { clienteRepository } from '../repositories/cliente.repository'
import { notificationFactory } from './notification-factory.service'
import type { CrearRutinaDto, ActualizarRutinaDto, AsignarRutinaDto } from '../dtos/rutina.dto'

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
    const existentes = await Promise.all(
      idsEjercicios.map((id) => ejercicioRepository.buscarPorId(id))
    )
    const noExistentes = idsEjercicios.filter((_, i) => !existentes[i])
    if (noExistentes.length > 0) {
      throw Object.assign(new Error('Uno o más ejercicios no existen'), { statusCode: 400 })
    }

    const ejerciciosOtroGym = existentes.filter(
      (e) => e && e.id_gimnasio !== idGimnasio
    )
    if (ejerciciosOtroGym.length > 0) {
      throw Object.assign(new Error('Uno o más ejercicios no pertenecen a este gimnasio'), { statusCode: 400 })
    }

    return prisma.$transaction(async () => {
      const rutina = await rutinaRepository.crear({
        id_gimnasio: idGimnasio,
        id_usuario_creador: idUsuarioCreador,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
      })

      await rutinaRepository.agregarEjercicios(
        rutina.id_rutina,
        dto.ejercicios.map((e) => ({
          id_ejercicio: BigInt(e.id_ejercicio),
          series: e.series,
          repeticiones: e.repeticiones,
          peso_sugerido: e.peso_sugerido,
        }))
      )

      return rutinaRepository.buscarPorId(rutina.id_rutina)
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

    return prisma.$transaction(async () => {
      if (dto.nombre !== undefined || dto.descripcion !== undefined) {
        await rutinaRepository.actualizar(id, {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
        })
      }

      if (dto.ejercicios) {
        const idsEjercicios = dto.ejercicios.map((e) => BigInt(e.id_ejercicio))
        const existentes = await Promise.all(
          idsEjercicios.map((eid) => ejercicioRepository.buscarPorId(eid))
        )
        const noExistentes = idsEjercicios.filter((_, i) => !existentes[i])
        if (noExistentes.length > 0) {
          throw Object.assign(new Error('Uno o más ejercicios no existen'), { statusCode: 400 })
        }

        await rutinaRepository.eliminarEjercicios(id)
        await rutinaRepository.agregarEjercicios(
          id,
          dto.ejercicios.map((e) => ({
            id_ejercicio: BigInt(e.id_ejercicio),
            series: e.series,
            repeticiones: e.repeticiones,
            peso_sugerido: e.peso_sugerido,
          }))
        )
      }

      return rutinaRepository.buscarPorId(id)
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

    return prisma.$transaction(async () => {
      await rutinaRepository.eliminarEjercicios(id)
      await prisma.clienteRutina.deleteMany({ where: { id_rutina: id } })
      return rutinaRepository.eliminar(id)
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

    const duplicado = await rutinaRepository.buscarAsignacionActiva(idCliente, idRutina)
    if (duplicado) {
      throw Object.assign(new Error('El cliente ya tiene esta rutina asignada'), { statusCode: 409 })
    }

    const fecha = dto.fecha_asignacion ? new Date(dto.fecha_asignacion) : new Date()
    fecha.setHours(0, 0, 0, 0)

    const asignacion = await rutinaRepository.asignarCliente({
      id_cliente: idCliente,
      id_rutina: idRutina,
      id_entrenador_asignador: idEntrenadorAsignador,
      fecha_asignacion: fecha,
      estado: 'activa',
    })

    await notificationFactory.crear({
      tipo: 'SISTEMA',
      destino: { id_cliente: idCliente, id_gimnasio: idGimnasio },
      titulo: 'Rutina asignada',
      mensaje: `Se te ha asignado la rutina: ${rutina.nombre}`,
    })

    return asignacion
  },

  async listarAsignaciones(idRutina: bigint) {
    return rutinaRepository.listarAsignaciones(idRutina)
  },
}
