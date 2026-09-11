/**
 * Servicio de negocio del módulo cliente-membresia.service.
 *
 * @remarks Contiene reglas del dominio FitManager y coordina repositorios, transacciones y efectos secundarios.
 */
import { prisma } from '../lib/prisma'
import { clienteMembresiaRepository } from '../repositories/cliente-membresia.repository'
import { clienteRepository } from '../repositories/cliente.repository'
import { notificationFactory, type InputCrearNotificacion } from './notification-factory.service'
import type { AsignarMembresiaDto } from '../dtos/cliente-membresia.dto'
import {
  obtenerObligacionesPendientesCliente,
  obtenerResumenPago,
  calcularFechaPagoHabilitada,
  ESTADOS_PAGO_CONFIRMADO,
} from './payment-balance'
import { AppError } from '../lib/errors'
import { resolveMembershipStatus } from './membership-status'

function addDaysUtc(date: Date, days: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

// Formatea una fecha de calendario (dd/mm/yyyy) sin depender de la zona horaria del servidor.
function fmtFecha(d: Date): string {
  const [y, m, dia] = d.toISOString().slice(0, 10).split('-')
  return `${dia}/${m}/${y}`
}

export const clienteMembresiaService = {
  async listarPorCliente(idCliente: bigint, idGimnasio: bigint) {
    const cliente = await clienteRepository.buscarPorId(idCliente)
    if (!cliente || cliente.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }
    return clienteMembresiaRepository.listarPorCliente(idCliente)
  },

  async listarTodas(idGimnasio: bigint) {
    return clienteMembresiaRepository.listarPorGimnasio(idGimnasio)
  },

  async listarTodasPaginado(idGimnasio: bigint, page: number, pageSize: number, search?: string) {
    return clienteMembresiaRepository.listarPorGimnasioPaginado(idGimnasio, page, pageSize, search)
  },

  async listarRecientes(idGimnasio: bigint) {
    return clienteMembresiaRepository.listarRecientes(idGimnasio, 15)
  },

  /**
   * Asigna una membresía activa a un cliente del gimnasio.
   *
   * Valida tenant, plan activo, ausencia de otra membresía activa y capacidad
   * del entrenador. La operación corre en transacción para mantener consistentes
   * la membresía, asignación de entrenador y notificaciones.
   *
   * @param idGimnasio - Gimnasio que realiza la asignación.
   * @param dto - Cliente, plan, fecha de inicio y entrenador opcional.
   * @returns Membresía asignada con datos relacionados.
   */
  async asignar(idGimnasio: bigint, dto: AsignarMembresiaDto) {
    return prisma.$transaction(async (tx) => {
      const idCliente = BigInt(dto.id_cliente)
      const idMembresia = BigInt(dto.id_membresia)

      const cliente = await tx.cliente.findFirst({
        where: { id_cliente: idCliente, id_gimnasio: idGimnasio, estado: true },
      })
      if (!cliente) {
        throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
      }

      const membresia = await tx.membresia.findFirst({
        where: { id_membresia: idMembresia, id_gimnasio: idGimnasio, estado: true },
      })
      if (!membresia) {
        throw Object.assign(new Error('Membresía no válida'), { statusCode: 404 })
      }

      const activa = await clienteMembresiaRepository.listarActivaPorCliente(idCliente, tx)
      if (activa) {
        throw Object.assign(new Error('El cliente ya tiene una membresía activa'), { statusCode: 400 })
      }

      let entrenador: { id_usuario: bigint; nombre: string; apellido: string } | null = null

      if (dto.id_entrenador) {
        const idEntrenador = BigInt(dto.id_entrenador)
        // Lock serializes concurrent capacity checks on the same trainer.
        await tx.$queryRaw`SELECT id_usuario FROM usuario WHERE id_usuario = ${idEntrenador} FOR UPDATE`
        const entrenadorDb = await tx.usuario.findUnique({ where: { id_usuario: idEntrenador } })
        if (!entrenadorDb || entrenadorDb.id_gimnasio !== idGimnasio) {
          throw Object.assign(new Error('Entrenador no encontrado'), { statusCode: 404 })
        }
        if (entrenadorDb.rol !== 'Entrenador' || !entrenadorDb.estado) {
          throw Object.assign(new Error('El entrenador no está disponible'), { statusCode: 400 })
        }
        const clientesActuales = await tx.cliente.count({
          where: {
            id_entrenador: idEntrenador,
            estado: true,
            id_gimnasio: idGimnasio,
            cliente_membresias: { some: { estado: 'activo' } },
          },
        })
        if (clientesActuales >= entrenadorDb.capacidad_max) {
          throw Object.assign(
            new Error(
              `El entrenador ${entrenadorDb.nombre} ${entrenadorDb.apellido} ha alcanzado su capacidad máxima (${entrenadorDb.capacidad_max} clientes)`,
            ),
            { statusCode: 409 },
          )
        }
        entrenador = entrenadorDb
      }

      const fechaInicio = new Date(dto.fecha_inicio)
      const fechaFin = addDaysUtc(fechaInicio, membresia.duracion_dias)

      const result = await clienteMembresiaRepository.crear(
        {
          id_cliente: idCliente,
          id_membresia: idMembresia,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          monto_adeudado: Number(membresia.precio),
          fecha_pago_habilitada: calcularFechaPagoHabilitada(fechaInicio, fechaFin),
          fecha_vencimiento_pago: fechaFin,
          estado: 'activo',
        },
        tx,
      )

      const notifs: InputCrearNotificacion[] = [
        {
          tipo: 'MEMBRESIA',
          destino: { id_cliente: idCliente },
          titulo: 'Nueva membresía',
          mensaje: `Se activó tu membresía ${membresia.nombre}, vigente hasta el ${fmtFecha(fechaFin)}.`,
          accionUrl: '/cliente/membresia',
        },
        {
          tipo: 'MEMBRESIA',
          destino: { id_gimnasio: idGimnasio, rol_destino: 'Administrador' },
          titulo: 'Membresía asignada',
          mensaje: `Se asignó la membresía ${membresia.nombre} a ${cliente.nombre} ${cliente.apellido}, vigente del ${fmtFecha(fechaInicio)} al ${fmtFecha(fechaFin)}.`,
          accionUrl: '/dashboard/clientes',
        },
      ]

      if (dto.id_entrenador && entrenador) {
        await tx.cliente.update({
          where: { id_cliente: idCliente },
          data: { id_entrenador: entrenador.id_usuario },
        })

        notifs.push({
          tipo: 'SISTEMA',
          destino: { id_usuario_destino: entrenador.id_usuario },
          titulo: 'Nuevo cliente asignado',
          mensaje: `${cliente.nombre} ${cliente.apellido} fue asignado a tu cartera de clientes.`,
          accionUrl: '/dashboard/clientes',
        })
      }

      await notificationFactory.crearMultiple(notifs, tx)

      return result
    })
  },

  /**
   * Cancela una membresía activa sin borrar su historial financiero.
   *
   * La cancelación cambia el estado y emite notificaciones; no elimina pagos ni
   * asignaciones históricas, porque esos datos son evidencia operativa.
   *
   * @param idClienteMembresia - Membresía asignada que se desea cancelar.
   * @param idGimnasio - Gimnasio propietario de la asignación.
   * @returns Membresía actualizada con estado cancelado.
   */
  async cancelar(idClienteMembresia: bigint, idGimnasio: bigint) {
    return prisma.$transaction(async (tx) => {
      const actual = await clienteMembresiaRepository.buscarPorId(idClienteMembresia, tx)
      if (!actual) {
        throw Object.assign(new Error('Asignación no encontrada'), { statusCode: 404 })
      }
      if (actual.estado !== 'activo') {
        throw Object.assign(new Error('La membresía no está activa'), { statusCode: 400 })
      }

      const cliente = await tx.cliente.findFirst({
        where: { id_cliente: actual.id_cliente, id_gimnasio: idGimnasio },
      })
      if (!cliente) {
        throw Object.assign(new Error('Asignación no encontrada'), { statusCode: 404 })
      }

      const result = await clienteMembresiaRepository.actualizarEstado(idClienteMembresia, 'cancelada', tx)

      const notifs: InputCrearNotificacion[] = [
        {
          tipo: 'MEMBRESIA',
          destino: { id_cliente: actual.id_cliente },
          titulo: 'Membresía cancelada',
          mensaje: 'Tu membresía fue cancelada. Si necesitas renovarla, consulta con tu gimnasio.',
          accionUrl: '/cliente/membresia',
        },
        {
          tipo: 'MEMBRESIA',
          destino: { id_gimnasio: idGimnasio, rol_destino: 'Administrador' },
          titulo: 'Membresía cancelada',
          mensaje: `La membresía de ${cliente.nombre} ${cliente.apellido} fue cancelada.`,
          accionUrl: '/dashboard/clientes',
        },
      ]

      if (cliente.id_entrenador) {
        notifs.push({
          tipo: 'SISTEMA',
          destino: { id_usuario_destino: cliente.id_entrenador },
          titulo: 'Cliente desasignado',
          mensaje: `${cliente.nombre} ${cliente.apellido} ya no está asignado a tu cartera de clientes.`,
        })
      }

      await notificationFactory.crearMultiple(notifs, tx)

      return result
    })
  },

  async consultarEstado(idCliente: bigint, idGimnasio: bigint) {
    const cliente = await prisma.cliente.findUnique({
      where: { id_cliente: idCliente },
      include: {
        entrenador: { select: { id_usuario: true, nombre: true, apellido: true, estado: true, correo: true } },
      },
    })
    if (!cliente || cliente.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }

    const asignaciones = await clienteMembresiaRepository.listarPorCliente(idCliente)
    const activa = asignaciones.find((a: any) => resolveMembershipStatus(a) === 'ACTIVA')
    const vencida = asignaciones.find((a: any) => resolveMembershipStatus(a) === 'VENCIDA')

    const calcularProgreso = (inicio: Date, fin: Date) => {
      const total = fin.getTime() - inicio.getTime()
      const transcurrido = Date.now() - inicio.getTime()
      return Math.min(100, Math.max(0, Math.round((transcurrido / total) * 100)))
    }

    const mapearMembresia = (a: any) => ({
      id: a.id_cliente_membresia,
      idMembresia: a.id_membresia,
      plan: a.membresia.nombre,
      precio: Number(a.membresia.precio),
      duracionDias: a.membresia.duracion_dias,
      inicio: a.fecha_inicio,
      fin: a.fecha_fin,
      estado: a.estado,
      estado_efectivo: resolveMembershipStatus(a),
      diasRestantes: Math.ceil((new Date(a.fecha_fin).getTime() - Date.now()) / 86400000),
      progreso: calcularProgreso(new Date(a.fecha_inicio), new Date(a.fecha_fin)),
    })

    const historial = await prisma.clienteMembresia.findMany({
      where: { id_cliente: idCliente },
      include: { membresia: { select: { nombre: true, precio: true, duracion_dias: true } } },
      orderBy: { fecha_inicio: 'desc' },
      take: 5,
    })

    return {
      cliente: {
        id_cliente: cliente.id_cliente,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        cedula: cliente.cedula,
        correo: cliente.correo,
        telefono: cliente.telefono,
        fecha_registro: cliente.fecha_registro,
        estado: cliente.estado,
        entrenador: cliente.entrenador
          ? {
              id_usuario: Number(cliente.entrenador.id_usuario),
              nombre: cliente.entrenador.nombre,
              apellido: cliente.entrenador.apellido,
              estado: cliente.entrenador.estado,
            }
          : null,
      },
      membresiaActiva: activa ? mapearMembresia(activa) : null,
      membresiaVencida: vencida ? mapearMembresia(vencida) : null,
      historial: historial.map((h: any) => ({
        id: h.id_cliente_membresia,
        plan: h.membresia.nombre,
        precio: Number(h.membresia.precio),
        duracionDias: h.membresia.duracion_dias,
        inicio: h.fecha_inicio,
        fin: h.fecha_fin,
        estado: h.estado,
        estado_efectivo: resolveMembershipStatus(h),
      })),
    }
  },

  async cambiarPlan(idCliente: bigint, idGimnasio: bigint, dto: { id_membresia: bigint; fecha_inicio?: string }) {
    return prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.findFirst({
        where: { id_cliente: idCliente, id_gimnasio: idGimnasio },
      })
      if (!cliente) {
        throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
      }
      if (!cliente.estado) {
        throw Object.assign(new Error('Cliente inactivo'), { statusCode: 400 })
      }

      const nuevoPlan = await tx.membresia.findFirst({
        where: { id_membresia: dto.id_membresia, id_gimnasio: idGimnasio, estado: true },
      })
      if (!nuevoPlan) {
        throw Object.assign(new Error('Plan de membresía no válido'), { statusCode: 404 })
      }

      const obligacionesPendientes = await obtenerObligacionesPendientesCliente(idGimnasio, idCliente, tx)
      const deudaTotal = obligacionesPendientes.reduce((total, obligacion) => total + obligacion.saldo_pendiente, 0)
      if (deudaTotal > 0) {
        throw new AppError(
          'El cliente mantiene un saldo pendiente. Debe cancelar la deuda antes de cambiar de membresía.',
          409,
          'OUTSTANDING_BALANCE_PREVENTS_MEMBERSHIP_CHANGE',
          {
            saldo_pendiente: deudaTotal,
          },
        )
      }

      const activa = await clienteMembresiaRepository.listarActivaPorCliente(idCliente, tx)
      if (activa) {
        await clienteMembresiaRepository.actualizarEstado(activa.id_cliente_membresia, 'cancelada', tx)
      }

      const fechaInicio = dto.fecha_inicio ? new Date(dto.fecha_inicio) : new Date()
      const fechaFin = addDaysUtc(fechaInicio, nuevoPlan.duracion_dias)

      const result = await clienteMembresiaRepository.crear(
        {
          id_cliente: idCliente,
          id_membresia: dto.id_membresia,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          monto_adeudado: Number(nuevoPlan.precio),
          fecha_pago_habilitada: calcularFechaPagoHabilitada(fechaInicio, fechaFin),
          fecha_vencimiento_pago: fechaFin,
          estado: 'activo',
        },
        tx,
      )

      await notificationFactory.crearMultiple(
        [
          {
            tipo: 'MEMBRESIA',
            destino: { id_cliente: idCliente },
            titulo: 'Plan actualizado',
            mensaje: `Tu membresía cambió al plan ${nuevoPlan.nombre}, vigente hasta el ${fmtFecha(fechaFin)}.`,
            accionUrl: '/cliente/membresia',
          },
          {
            tipo: 'MEMBRESIA',
            destino: { id_gimnasio: idGimnasio, rol_destino: 'Administrador' },
            titulo: 'Plan cambiado',
            mensaje: `El plan de ${cliente.nombre} ${cliente.apellido} cambió a "${nuevoPlan.nombre}".`,
            accionUrl: '/dashboard/clientes',
          },
        ],
        tx,
      )

      return result
    })
  },

  /**
   * Renueva manualmente una membresía existente.
   *
   * La renovación extiende la misma fila activa, exige al menos 80% pagado y
   * crea una nueva obligación para el periodo siguiente. El bloqueo `FOR UPDATE`
   * evita que dos renovaciones simultáneas dupliquen fechas o saldos.
   *
   * @param idClienteMembresia - Membresía activa a extender.
   * @param idGimnasio - Gimnasio dueño de la membresía.
   * @returns Membresía extendida al nuevo periodo.
   */
  async renovar(idClienteMembresia: bigint, idGimnasio: bigint) {
    return prisma.$transaction(async (tx) => {
      // El lock evita lost updates y serializa renovaciones simultáneas.
      await tx.$queryRaw`SELECT id_cliente_membresia FROM cliente_membresia WHERE id_cliente_membresia = ${idClienteMembresia} FOR UPDATE`
      const actual = await clienteMembresiaRepository.buscarPorId(idClienteMembresia, tx)
      if (!actual) {
        throw Object.assign(new Error('Asignación no encontrada'), { statusCode: 404 })
      }
      if (actual.estado !== 'activo') {
        throw Object.assign(new Error('Solo se puede renovar una membresía activa'), { statusCode: 400 })
      }

      const membresia = await tx.membresia.findFirst({
        where: { id_membresia: actual.id_membresia, id_gimnasio: idGimnasio, estado: true },
      })
      const cliente = await tx.cliente.findFirst({
        where: { id_cliente: actual.id_cliente, id_gimnasio: idGimnasio, estado: true },
      })
      if (!membresia || !cliente) {
        throw Object.assign(new Error('Membresía no válida'), { statusCode: 404 })
      }

      const obligacionActual = await obtenerResumenPago(idGimnasio, idClienteMembresia, tx)
      let montoTotal = obligacionActual.monto_total
      let montoPagado = obligacionActual.monto_pagado
      // La obligación automática de renovación (`RENOVACION`) corresponde al periodo
      // siguiente y se genera hasta cinco días antes de su vencimiento: no condiciona
      // la renovación manual. La proporción se recalcula sobre las obligaciones vigentes.
      if (obligacionActual.tipo_obligacion === 'RENOVACION') {
        const obligacionesVigentes = await tx.obligacionPago.findMany({
          where: {
            id_cliente_membresia: idClienteMembresia,
            id_gimnasio: idGimnasio,
            tipo: { not: 'RENOVACION' },
          },
          select: { id_obligacion_pago: true, monto_total: true },
        })
        const pagosVigentes = await tx.pago.aggregate({
          where: {
            id_obligacion_pago: { in: obligacionesVigentes.map((obligacion) => obligacion.id_obligacion_pago) },
            id_gimnasio: idGimnasio,
            estado: { in: ESTADOS_PAGO_CONFIRMADO },
          },
          _sum: { monto: true },
        })
        const totalVigente = obligacionesVigentes.reduce(
          (total, obligacion) => total + Number(obligacion.monto_total),
          0,
        )
        if (totalVigente > 0) {
          montoTotal = totalVigente
          montoPagado = Number(pagosVigentes._sum.monto ?? 0)
        }
      }
      const porcentajePago =
        montoTotal > 0
          ? Math.floor((montoPagado / montoTotal) * 10000) / 100
          : 0
      if (porcentajePago < 80) {
        throw new AppError(
          'Debe haber pagado al menos el 80% de la cuota para renovar manualmente.',
          409,
          'MANUAL_RENEWAL_REQUIRES_80_PERCENT',
          {
            porcentaje_pagado: porcentajePago,
            saldo_pendiente: montoTotal - montoPagado,
          },
        )
      }

      // Renovar extiende el contrato existente: conserva pagos y nunca crea
      // una segunda fila activa. Las llamadas concurrentes se aplican en serie.
      const nuevaFechaFin = addDaysUtc(actual.fecha_fin, membresia.duracion_dias)
      const result = await clienteMembresiaRepository.extender(
        idClienteMembresia,
        {
          fecha_fin: nuevaFechaFin,
          monto_adeudado: Number(actual.monto_adeudado) + Number(membresia.precio),
          fecha_pago_habilitada: calcularFechaPagoHabilitada(actual.fecha_fin, nuevaFechaFin),
          fecha_vencimiento_pago: nuevaFechaFin,
        },
        tx,
      )

      await tx.obligacionPago.upsert({
        where: {
          id_cliente_membresia_periodo_inicio_periodo_fin_tipo: {
            id_cliente_membresia: idClienteMembresia,
            periodo_inicio: actual.fecha_fin,
            periodo_fin: nuevaFechaFin,
            tipo: 'RENOVACION_MANUAL',
          },
        },
        create: {
          id_gimnasio: idGimnasio,
          id_cliente: actual.id_cliente,
          id_cliente_membresia: idClienteMembresia,
          periodo_inicio: actual.fecha_fin,
          periodo_fin: nuevaFechaFin,
          monto_total: membresia.precio,
          fecha_pago_habilitada: new Date(),
          fecha_vencimiento: nuevaFechaFin,
          tipo: 'RENOVACION_MANUAL',
        },
        update: {},
      })

      await notificationFactory.crearMultiple(
        [
          {
            tipo: 'MEMBRESIA',
            destino: { id_cliente: actual.id_cliente },
            titulo: 'Membresía renovada',
            mensaje: `Tu membresía "${membresia.nombre}" fue renovada hasta el ${fmtFecha(nuevaFechaFin)}.`,
            accionUrl: '/cliente/membresia',
          },
          {
            tipo: 'MEMBRESIA',
            destino: { id_gimnasio: idGimnasio, rol_destino: 'Administrador' },
            titulo: 'Membresía renovada',
            mensaje: `La membresía "${membresia.nombre}" de ${cliente.nombre} ${cliente.apellido} fue renovada hasta el ${fmtFecha(nuevaFechaFin)}.`,
            accionUrl: '/dashboard/clientes',
          },
        ],
        tx,
      )

      return result
    })
  },
}
