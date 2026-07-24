import { notificacionRepository } from '../repositories/notificacion.repository'
import { prisma } from '../lib/prisma'

const DIAS_ALERTA = 7

export const notificacionService = {
  async listar(idGimnasio: bigint, tipo?: string, rol?: string) {
    return notificacionRepository.listarPorGimnasio(idGimnasio, tipo, rol)
  },

  async contarNoLeidas(idGimnasio: bigint, rol?: string) {
    return notificacionRepository.noLeidasPorGimnasio(idGimnasio, rol)
  },

  async crearNotificacion(data: {
    id_cliente?: bigint
    id_gimnasio?: bigint
    id_solicitud?: bigint
    tipo?: 'MEMBRESIA' | 'TRANSFERENCIA' | 'SISTEMA'
    titulo: string
    mensaje: string
  }) {
    return notificacionRepository.crearSiNoExiste(data)
  },

  async marcarLeida(id: bigint, idGimnasio: bigint) {
    const noti = await prisma.notificacion.findUnique({
      where: { id_notificacion: id },
      include: { cliente: true },
    })
    if (!noti) {
      throw Object.assign(new Error('Notificación no encontrada'), { statusCode: 404 })
    }
    const pertenece = noti.cliente
      ? noti.cliente.id_gimnasio === idGimnasio
      : noti.id_gimnasio === idGimnasio
    if (!pertenece) {
      throw Object.assign(new Error('Notificación no encontrada'), { statusCode: 404 })
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

    const notificaciones: { id_cliente: bigint; titulo: string; mensaje: string }[] = []

    for (const m of memberships) {
      const fechaFin = new Date(m.fecha_fin)
      fechaFin.setHours(0, 0, 0, 0)

      if (fechaFin <= fechaLimite) {
        const diasRest = Math.ceil((fechaFin.getTime() - hoy.getTime()) / 86400000)
        notificaciones.push({
          id_cliente: m.id_cliente,
          titulo: 'Membresía próxima a vencer',
          mensaje: `La membresía "${m.membresia.nombre}" de ${m.cliente.nombre} ${m.cliente.apellido} vence en ${diasRest} día(s) (${fechaFin.toLocaleDateString()}).`,
        })
      }
    }

    for (const notificacion of notificaciones) {
      await notificacionRepository.crearSiNoExiste({
        id_cliente: notificacion.id_cliente,
        tipo: 'MEMBRESIA',
        titulo: notificacion.titulo,
        mensaje: notificacion.mensaje,
      })
    }

    return { generadas: notificaciones.length }
  },
}
