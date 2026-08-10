import { prisma } from '../lib/prisma'
import { clienteMembresiaRepository } from '../repositories/cliente-membresia.repository'
import { clienteRepository } from '../repositories/cliente.repository'
import { notificationFactory } from './notification-factory.service'
import type { AsignarMembresiaDto } from '../dtos/cliente-membresia.dto'

function addDaysUtc(date: Date, days: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
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

  async listarRecientes(idGimnasio: bigint) {
    return clienteMembresiaRepository.listarRecientes(idGimnasio, 15)
  },

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
        const entrenadorDb = await tx.usuario.findUnique({ where: { id_usuario: idEntrenador } })
        if (!entrenadorDb || entrenadorDb.id_gimnasio !== idGimnasio) {
          throw Object.assign(new Error('Entrenador no encontrado'), { statusCode: 404 })
        }
        if (entrenadorDb.rol !== 'Entrenador' || !entrenadorDb.estado) {
          throw Object.assign(new Error('El entrenador no está disponible'), { statusCode: 400 })
        }
        const clientesActuales = await tx.cliente.count({
          where: { id_entrenador: idEntrenador, estado: true, id_gimnasio: idGimnasio },
        })
        if (clientesActuales >= entrenadorDb.capacidad_max) {
          throw Object.assign(new Error(`El entrenador ${entrenadorDb.nombre} ${entrenadorDb.apellido} ha alcanzado su capacidad máxima (${entrenadorDb.capacidad_max} clientes)`), { statusCode: 409 })
        }
        entrenador = entrenadorDb
      }

      const fechaInicio = new Date(dto.fecha_inicio)
      const fechaFin = addDaysUtc(fechaInicio, membresia.duracion_dias)

      const result = await clienteMembresiaRepository.crear({
        id_cliente: idCliente,
        id_membresia: idMembresia,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado: 'activo',
      }, tx)

      if (dto.id_entrenador && entrenador) {
        await tx.cliente.update({
          where: { id_cliente: idCliente },
          data: { id_entrenador: entrenador.id_usuario },
        })

        const nombreEntrenador = `${entrenador.nombre} ${entrenador.apellido}`

        // Notificación para el entrenador (vinculada al cliente)
        await tx.notificacion.create({
          data: {
            id_cliente: idCliente,
            id_usuario_destino: entrenador.id_usuario,
            titulo: 'Nuevo cliente asignado',
            mensaje: `Se te asignó un nuevo cliente: ${cliente.nombre} ${cliente.apellido} - Plan ${membresia.nombre} en Ejercicio`,
            tipo: 'SISTEMA',
          },
        })

        // Notificación para administración/recepción (vinculada al gimnasio)
        await tx.notificacion.create({
          data: {
            id_gimnasio: idGimnasio,
            rol_destino: 'Administrador',
            titulo: 'Cliente asignado',
            mensaje: `El cliente ${cliente.nombre} ${cliente.apellido} fue asignado al entrenador ${nombreEntrenador}. Plan: ${membresia.nombre} en Ejercicio`,
            tipo: 'SISTEMA',
          },
        })
      }

      return result
    })
  },

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

      await notificationFactory.crearMultiple([
        { tipo: 'SISTEMA', destino: { id_cliente: actual.id_cliente }, titulo: 'Membresía cancelada', mensaje: 'Tu membresía ha sido cancelada.' },
        { tipo: 'SISTEMA', destino: { id_gimnasio: idGimnasio, rol_destino: 'Administrador' }, titulo: 'Membresía cancelada', mensaje: `La membresía de ${cliente.nombre} ${cliente.apellido} ha sido cancelada.` },
      ], tx)

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
    const activa = asignaciones.find((a: any) => a.estado === 'activo' && new Date(a.fecha_fin) >= new Date())
    const vencida = asignaciones.find((a: any) => a.estado === 'activo' && new Date(a.fecha_fin) < new Date())

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
        entrenador: cliente.entrenador ? {
          id_usuario: Number(cliente.entrenador.id_usuario),
          nombre: cliente.entrenador.nombre,
          apellido: cliente.entrenador.apellido,
          estado: cliente.entrenador.estado,
        } : null,
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

      const activa = await clienteMembresiaRepository.listarActivaPorCliente(idCliente, tx)
      if (activa) {
        await clienteMembresiaRepository.actualizarEstado(activa.id_cliente_membresia, 'cancelada', tx)
      }

      const fechaInicio = dto.fecha_inicio ? new Date(dto.fecha_inicio) : new Date()
      const fechaFin = addDaysUtc(fechaInicio, nuevoPlan.duracion_dias)

      const result = await clienteMembresiaRepository.crear({
        id_cliente: idCliente,
        id_membresia: dto.id_membresia,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado: 'activo',
      }, tx)

      await notificationFactory.crearMultiple([
        { tipo: 'MEMBRESIA', destino: { id_cliente: idCliente }, titulo: 'Plan actualizado', mensaje: `Tu plan cambió a "${nuevoPlan.nombre}".` },
        { tipo: 'MEMBRESIA', destino: { id_gimnasio: idGimnasio, rol_destino: 'Administrador' }, titulo: 'Plan cambiado', mensaje: `El plan de ${cliente.nombre} ${cliente.apellido} ha sido cambiado a "${nuevoPlan.nombre}".` },
      ], tx)

      return result
    })
  },

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

      // Renovar extiende el contrato existente: conserva pagos y nunca crea
      // una segunda fila activa. Las llamadas concurrentes se aplican en serie.
      const nuevaFechaFin = addDaysUtc(actual.fecha_fin, membresia.duracion_dias)
      const result = await clienteMembresiaRepository.extender(idClienteMembresia, nuevaFechaFin, tx)

      await notificationFactory.crearMultiple([
        { tipo: 'MEMBRESIA', destino: { id_cliente: actual.id_cliente }, titulo: 'Membresía renovada', mensaje: `Tu membresía "${membresia.nombre}" fue renovada hasta ${nuevaFechaFin.toLocaleDateString()}.` },
        { tipo: 'MEMBRESIA', destino: { id_gimnasio: idGimnasio, rol_destino: 'Administrador' }, titulo: 'Membresía renovada', mensaje: `La membresía "${membresia.nombre}" de ${cliente.nombre} ${cliente.apellido} fue renovada.` },
      ], tx)

      return result
    })
  },
}
