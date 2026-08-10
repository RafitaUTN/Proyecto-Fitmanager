import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { safeBigInt } from '../lib/bigint'
import { clienteAuthService } from '../services/cliente-auth.service'
import { cambiarPasswordClienteSchema } from '../dtos/auth.dto'
import { calcularBalancePago } from '../services/payment-balance'

export const clientePortalController = {
  async perfil(req: Request, res: Response, next: NextFunction) {
    try {
      const idCliente = safeBigInt(req.usuario.id_usuario)

      const cliente = await prisma.cliente.findUnique({
        where: { id_cliente: idCliente },
        include: {
          gimnasio: { select: { nombre: true } },
          entrenador: { select: { nombre: true, apellido: true } },
        },
      })

      if (!cliente || cliente.estado === false) {
        res.status(404).json({ error: 'Cliente no encontrado' })
        return
      }

      res.json({
        id_cliente: Number(cliente.id_cliente),
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        correo: cliente.correo,
        telefono: cliente.telefono,
        cedula: cliente.cedula,
        ultimo_acceso: cliente.ultimo_acceso,
        nombre_gimnasio: cliente.gimnasio?.nombre ?? '',
        entrenador: cliente.entrenador,
      })
    } catch (error) { next(error) }
  },

  async membresia(req: Request, res: Response, next: NextFunction) {
    try {
      const idCliente = safeBigInt(req.usuario.id_usuario)

      const membresiaActiva = await prisma.clienteMembresia.findFirst({
        where: { id_cliente: idCliente, estado: 'activo' },
        include: {
          membresia: true,
          pagos: { where: { estado: { in: ['completado', 'confirmado'] } }, select: { monto: true } },
        },
      })

      const membresiasAnteriores = await prisma.clienteMembresia.findMany({
        where: { id_cliente: idCliente, estado: { not: 'activo' } },
        include: { membresia: true },
        orderBy: { fecha_inicio: 'desc' },
        take: 20,
      })

      if (!membresiaActiva) {
        res.json(null)
        return
      }

      const inicio = new Date(membresiaActiva.fecha_inicio).getTime()
      const fin = new Date(membresiaActiva.fecha_fin).getTime()
      const ahora = Date.now()
      const total = fin - inicio
      const transcurrido = ahora - inicio
      const progreso = total > 0 ? Math.min(100, Math.round((transcurrido / total) * 100)) : 0
      const diasRestantes = Math.max(0, Math.ceil((fin - ahora) / (1000 * 60 * 60 * 24)))
      const montoPagado = membresiaActiva.pagos.reduce((total, pago) => total + Number(pago.monto), 0)
      const pago = calcularBalancePago({ total: membresiaActiva.membresia.precio, pagado: montoPagado, fechaFin: membresiaActiva.fecha_fin })

      res.json({
        id: Number(membresiaActiva.id_cliente_membresia),
        plan: {
          nombre: membresiaActiva.membresia.nombre,
          descripcion: membresiaActiva.membresia.descripcion,
          duracion_dias: membresiaActiva.membresia.duracion_dias,
          precio: Number(membresiaActiva.membresia.precio),
        },
        fecha_inicio: membresiaActiva.fecha_inicio,
        fecha_fin: membresiaActiva.fecha_fin,
        estado: membresiaActiva.estado,
        progreso,
        dias_restantes: diasRestantes,
        pago: {
          ...pago,
          fecha_pago_habilitada: membresiaActiva.fecha_inicio,
        },
        historial: membresiasAnteriores.map((m) => ({
          id: Number(m.id_cliente_membresia),
          plan: m.membresia.nombre,
          fecha_inicio: m.fecha_inicio,
          fecha_fin: m.fecha_fin,
          estado: m.estado,
        })),
      })
    } catch (error) { next(error) }
  },

  async rutinas(req: Request, res: Response, next: NextFunction) {
    try {
      const idCliente = safeBigInt(req.usuario.id_usuario)

      const asignaciones = await prisma.clienteRutina.findMany({
        where: { id_cliente: idCliente },
        include: {
          rutina: true,
          ejercicios: {
            include: { ejercicio: true },
            orderBy: { orden: 'asc' },
          },
        },
        orderBy: { fecha_asignacion: 'desc' },
      })

      res.json(
        asignaciones.map((a) => ({
          id: Number(a.id_rutina),
          nombre: a.rutina.nombre,
          descripcion: a.rutina.descripcion,
          fecha_asignacion: a.fecha_asignacion,
          estado: a.estado || 'activa',
          ejercicios: a.ejercicios.map((re) => ({
            id: Number(re.id_ejercicio),
            nombre: re.nombre,
            descripcion: re.ejercicio?.descripcion ?? null,
            series: re.series,
            repeticiones: re.repeticiones,
            peso: re.peso,
            notas: re.observaciones,
          })),
        }))
      )
    } catch (error) { next(error) }
  },

  async cambiarPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = cambiarPasswordClienteSchema.parse(req.body)
      const idCliente = safeBigInt(req.usuario.id_usuario)

      await clienteAuthService.cambiarPassword(idCliente, dto.password_actual, dto.password_nueva)
      res.json({ mensaje: 'Contraseña actualizada correctamente.' })
    } catch (error: any) {
      if (error.codigo) {
        res.status(error.statusCode || 400).json({ error: error.message, codigo: error.codigo })
        return
      }
      next(error)
    }
  },
}
