import { prisma } from '../lib/prisma'
import { clienteMembresiaRepository } from '../repositories/cliente-membresia.repository'
import { membresiaRepository } from '../repositories/membresia.repository'
import { clienteRepository } from '../repositories/cliente.repository'
import type { AsignarMembresiaDto } from '../dtos/cliente-membresia.dto'

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

  async asignar(idGimnasio: bigint, dto: AsignarMembresiaDto) {
    return prisma.$transaction(async (tx) => {
      const idCliente = BigInt(dto.id_cliente)
      const idMembresia = BigInt(dto.id_membresia)

      const cliente = await clienteRepository.buscarPorId(idCliente)
      if (!cliente || cliente.id_gimnasio !== idGimnasio) {
        throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
      }

      const membresia = await membresiaRepository.buscarPorId(idMembresia)
      if (!membresia || membresia.id_gimnasio !== idGimnasio || !membresia.estado) {
        throw Object.assign(new Error('Membresía no válida'), { statusCode: 404 })
      }

      const activa = await clienteMembresiaRepository.listarActivaPorCliente(idCliente, tx)
      if (activa) {
        throw Object.assign(new Error('El cliente ya tiene una membresía activa'), { statusCode: 400 })
      }

      const fechaInicio = new Date(dto.fecha_inicio)
      const fechaFin = new Date(fechaInicio)
      fechaFin.setDate(fechaFin.getDate() + membresia.duracion_dias)

      return clienteMembresiaRepository.crear({
        id_cliente: idCliente,
        id_membresia: idMembresia,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado: 'activo',
      }, tx)
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

      const cliente = await clienteRepository.buscarPorId(actual.id_cliente)
      if (!cliente || cliente.id_gimnasio !== idGimnasio) {
        throw Object.assign(new Error('No autorizado'), { statusCode: 403 })
      }

      return clienteMembresiaRepository.actualizarEstado(idClienteMembresia, 'cancelada', tx)
    })
  },

  async consultarEstado(idCliente: bigint, idGimnasio: bigint) {
    const cliente = await clienteRepository.buscarPorId(idCliente)
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
      },
      membresiaActiva: activa ? mapearMembresia(activa) : null,
      membresiaVencida: vencida ? mapearMembresia(vencida) : null,
    }
  },

  async renovar(idClienteMembresia: bigint, idGimnasio: bigint) {
    return prisma.$transaction(async (tx) => {
      const actual = await clienteMembresiaRepository.buscarPorId(idClienteMembresia, tx)
      if (!actual) {
        throw Object.assign(new Error('Asignación no encontrada'), { statusCode: 404 })
      }
      if (actual.estado !== 'activo') {
        throw Object.assign(new Error('Solo se puede renovar una membresía activa'), { statusCode: 400 })
      }

      const membresia = await membresiaRepository.buscarPorId(actual.id_membresia)
      if (!membresia || membresia.id_gimnasio !== idGimnasio) {
        throw Object.assign(new Error('Membresía no válida'), { statusCode: 404 })
      }

      const otrasActivas = await clienteMembresiaRepository.listarActivaPorCliente(actual.id_cliente, tx)
      if (otrasActivas && otrasActivas.id_cliente_membresia !== idClienteMembresia) {
        throw Object.assign(new Error('El cliente ya tiene otra membresía activa'), { statusCode: 400 })
      }

      const nuevaFechaInicio = actual.fecha_fin
      const nuevaFechaFin = new Date(nuevaFechaInicio)
      nuevaFechaFin.setDate(nuevaFechaFin.getDate() + membresia.duracion_dias)

      return clienteMembresiaRepository.crear({
        id_cliente: actual.id_cliente,
        id_membresia: actual.id_membresia,
        fecha_inicio: nuevaFechaInicio,
        fecha_fin: nuevaFechaFin,
        estado: 'activo',
      }, tx)
    })
  },
}
