import { notificacionRepository } from '../repositories/notificacion.repository'
import { notificationFactory } from './notification-factory.service'
import type { InputCrearNotificacion } from './notification-factory.service'
import { prisma } from '../lib/prisma'
import { emailService } from '../email/email.service'
import { businessDateKey, calcularFechaPagoHabilitada, obtenerResumenPago } from './payment-balance'

export const notificacionService = {
  async generarAlertasTodosGimnasios(ahora = new Date()) {
    const gimnasios = await prisma.gimnasio.findMany({ select: { id_gimnasio: true } })
    let generadas = 0
    for (const gimnasio of gimnasios) {
      const resultado = await this.generarAlertas(gimnasio.id_gimnasio, ahora)
      generadas += resultado.generadas
    }
    return { gimnasios: gimnasios.length, generadas }
  },

  async listar(idGimnasio: bigint, tipo?: string, rol?: string, idUsuario?: number) {
    if (rol === 'Entrenador' && idUsuario) {
      return notificacionRepository.listarEntrenador(BigInt(idUsuario), idGimnasio, tipo)
    }
    if (rol === 'Recepcionista') return notificacionRepository.listarRecepcion(idGimnasio, tipo)
    return notificacionRepository.listarPorGimnasio(idGimnasio, tipo)
  },

  async contarNoLeidas(idGimnasio: bigint, rol?: string, idUsuario?: number) {
    if (rol === 'Entrenador' && idUsuario) {
      return notificacionRepository.contarNoLeidasEntrenador(BigInt(idUsuario), idGimnasio)
    }
    if (rol === 'Recepcionista') return notificacionRepository.contarNoLeidasRecepcion(idGimnasio)
    return prisma.notificacion.count({ where: { id_gimnasio: idGimnasio, leida: false } })
  },

  crear(input: InputCrearNotificacion) {
    return notificationFactory.crear(input)
  },

  crearMultiple(inputs: InputCrearNotificacion[]) {
    return notificationFactory.crearMultiple(inputs)
  },

  async marcarLeida(id: bigint, idGimnasio: bigint, rol?: string, idUsuario?: number) {
    const notificacion = await prisma.notificacion.findUnique({ where: { id_notificacion: id } })
    if (!notificacion || notificacion.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Notificación no encontrada'), { statusCode: 404 })
    }

    if (rol === 'Entrenador') {
      const esDestinatario = notificacion.id_usuario_destino !== null && notificacion.id_usuario_destino === BigInt(idUsuario ?? -1)
      if (!esDestinatario) {
        throw Object.assign(new Error('No autorizado para marcar esta notificación'), { statusCode: 404 })
      }
    } else if (rol === 'Recepcionista') {
      const compatible = notificacion.rol_destino === 'Recepcionista' || notificacion.rol_destino === null
      if (!compatible) {
        throw Object.assign(new Error('No autorizado para marcar esta notificación'), { statusCode: 404 })
      }
    }

    return notificacionRepository.marcarLeida(id)
  },

  async listarCliente(idCliente: bigint, idGimnasio: bigint, tipo?: string) {
    return notificacionRepository.listarCliente(idCliente, idGimnasio, tipo)
  },

  async contarNoLeidasCliente(idCliente: bigint, idGimnasio: bigint) {
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

  async generarAlertas(idGimnasio: bigint, ahora = new Date()) {
    const membresias = await prisma.clienteMembresia.findMany({
      where: {
        estado: 'activo',
        cliente: { id_gimnasio: idGimnasio },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            correo: true,
            gimnasio: { select: { nombre: true } },
          },
        },
        membresia: { select: { nombre: true } },
      },
    })

    let generadas = 0
    for (const m of membresias) {
      const apertura = calcularFechaPagoHabilitada(m.fecha_inicio, m.fecha_fin)
      if (businessDateKey(ahora) < apertura.toISOString().slice(0, 10)) continue
      const resumen = await obtenerResumenPago(idGimnasio, m.id_cliente_membresia, prisma, ahora)
      if (resumen.saldo_pendiente <= 0) continue

      const vencimiento = m.fecha_fin.toISOString().slice(0, 10)
      const saldo = resumen.saldo_pendiente.toLocaleString('es-CR')
      const creada = await notificationFactory.crearUnaVez({
        tipo: 'MEMBRESIA',
        destino: { id_cliente: m.id_cliente },
        titulo: 'Tu próximo pago ya está disponible',
        mensaje: `Tu membresía ${m.membresia.nombre} vence el ${vencimiento}. Tienes un saldo pendiente de ₡${saldo}. Ya puedes realizar el pago correspondiente.`,
        eventKey: `pago_disponible_cliente_${m.id_cliente_membresia}_${vencimiento}`,
        accionUrl: '/cliente/membresia',
      })
      if (creada) generadas += 1

      await emailService.sendPaymentAvailableEmail({
        idClienteMembresia: m.id_cliente_membresia,
        nombre: `${m.cliente.nombre} ${m.cliente.apellido}`,
        correo: m.cliente.correo,
        plan: m.membresia.nombre,
        vencimiento,
        saldoPendiente: resumen.saldo_pendiente,
        gimnasio: m.cliente.gimnasio.nombre,
      })
    }
    return { generadas }
  },
}
