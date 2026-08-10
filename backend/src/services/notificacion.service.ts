import { notificacionRepository } from '../repositories/notificacion.repository'
import { notificationFactory } from './notification-factory.service'
import type { InputCrearNotificacion } from './notification-factory.service'
import { prisma } from '../lib/prisma'

const DIAS_ALERTA = 7

export const notificacionService = {
  async listar(idGimnasio: bigint, tipo?: string, rol?: string, idUsuario?: number) {
    if (rol === 'Entrenador' && idUsuario) {
      return notificacionRepository.listarEntrenador(BigInt(idUsuario), idGimnasio, tipo)
    }
    if (rol === 'Recepcionista') return notificacionRepository.listarRecepcion(idGimnasio, tipo)
    return notificacionRepository.listarAdmin(idGimnasio, tipo)
  },

  async contarNoLeidas(idGimnasio: bigint, rol?: string, idUsuario?: number) {
    if (rol === 'Entrenador' && idUsuario) {
      return notificacionRepository.contarNoLeidasEntrenador(BigInt(idUsuario), idGimnasio)
    }
    if (rol === 'Recepcionista') return notificacionRepository.contarNoLeidasRecepcion(idGimnasio)
    return notificacionRepository.contarNoLeidasAdmin(idGimnasio)
  },

  crear(input: InputCrearNotificacion) {
    return notificationFactory.crear(input)
  },

  listarCliente(idCliente: bigint, idGimnasio: bigint, tipo?: string) {
    return notificacionRepository.listarCliente(idCliente, idGimnasio, tipo)
  },

  contarNoLeidasCliente(idCliente: bigint, idGimnasio: bigint) {
    return notificacionRepository.contarNoLeidasCliente(idCliente, idGimnasio)
  },

  async marcarLeidaCliente(id: bigint, idCliente: bigint, idGimnasio: bigint) {
    const notificacion = await prisma.notificacion.findFirst({
      where: { id_notificacion: id, id_cliente: idCliente, cliente: { id_gimnasio: idGimnasio } },
      select: { id_notificacion: true },
    })
    if (!notificacion) throw Object.assign(new Error('Notificación no encontrada'), { statusCode: 404 })
    return notificacionRepository.marcarLeida(id)
  },

  async marcarLeida(id: bigint, idGimnasio: bigint, rol?: string, idUsuario?: number) {
    const noti = await prisma.notificacion.findUnique({
      where: { id_notificacion: id },
      include: { cliente: true },
    })
    if (!noti) {
      throw Object.assign(new Error('Notificación no encontrada'), { statusCode: 404 })
    }

    if (rol === 'Entrenador' && idUsuario) {
      if (noti.id_usuario_destino !== BigInt(idUsuario)) {
        throw Object.assign(new Error('Notificación no encontrada'), { statusCode: 404 })
      }
    } else {
      const rolCompatible = !noti.rol_destino || noti.rol_destino === rol
      if (noti.id_gimnasio !== idGimnasio || !rolCompatible) {
        throw Object.assign(new Error('Notificación no encontrada'), { statusCode: 404 })
      }
    }

    return notificacionRepository.marcarLeida(id)
  },

  async generarAlertas(idGimnasio: bigint) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const fechaLimite = new Date(hoy)
    fechaLimite.setDate(fechaLimite.getDate() + DIAS_ALERTA)

    const memberships = await prisma.clienteMembresia.findMany({
      where: {
        cliente: { id_gimnasio: idGimnasio },
        estado: 'activo',
        fecha_fin: { gte: hoy },
      },
      include: { cliente: true, membresia: true },
    })

    const inputs: InputCrearNotificacion[] = []

    for (const m of memberships) {
      const fechaFin = new Date(m.fecha_fin)
      fechaFin.setHours(0, 0, 0, 0)

      if (fechaFin <= fechaLimite) {
        const diasRest = Math.ceil((fechaFin.getTime() - hoy.getTime()) / 86400000)
        const titulo = 'Membresía próxima a vencer'
        const mensaje = `La membresía "${m.membresia.nombre}" de ${m.cliente.nombre} ${m.cliente.apellido} vence en ${diasRest} día(s) (${fechaFin.toLocaleDateString()}).`

        // Para el cliente titular de la membresía.
        inputs.push({
          eventKey: `membresia:${m.id_cliente_membresia}:vence:${fechaFin.toISOString().slice(0, 10)}:cliente`,
          tipo: 'MEMBRESIA',
          destino: { id_cliente: m.id_cliente },
          titulo,
          mensaje,
        })

        // Para administración.
        inputs.push({
          eventKey: `membresia:${m.id_cliente_membresia}:vence:${fechaFin.toISOString().slice(0, 10)}:gimnasio:${idGimnasio}`,
          tipo: 'MEMBRESIA',
          destino: { id_gimnasio: idGimnasio, rol_destino: 'Administrador' },
          titulo,
          mensaje,
        })
        inputs.push({
          eventKey: `membresia:${m.id_cliente_membresia}:vence:${fechaFin.toISOString().slice(0, 10)}:recepcion:${idGimnasio}`,
          tipo: 'MEMBRESIA',
          destino: { id_gimnasio: idGimnasio, rol_destino: 'Recepcionista' },
          titulo,
          mensaje,
        })
      }
    }

    if (inputs.length > 0) {
      const resultado = await notificacionRepository.crearMuchas(inputs.map(i => ({
        event_key: i.eventKey,
        id_cliente: i.destino.id_cliente,
        id_gimnasio: i.destino.id_gimnasio,
        id_solicitud: i.destino.id_solicitud,
        id_usuario_destino: i.destino.id_usuario_destino,
        rol_destino: i.destino.rol_destino,
        tipo: i.tipo as any,
        titulo: i.titulo,
        mensaje: i.mensaje,
      })))
      return { generadas: resultado.count }
    }

    return { generadas: 0 }
  },
}
