import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { safeBigInt } from '../lib/bigint'
import { asistenciaRepository } from '../repositories/asistencia.repository'

export const dashboardController = {
  async indicadores(req: Request, res: Response, next: NextFunction) {
    try {
      const idGimnasio = safeBigInt(req.usuario.id_gimnasio)
      const rol = req.usuario.rol
      const idUsuario = req.usuario.id_usuario
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const finDelDia = new Date(hoy)
      finDelDia.setHours(23, 59, 59, 999)

      const base = { id_gimnasio: idGimnasio }

      if (rol === 'Administrador') {
        const [totalClientes, clientesActivos, totalPagos, pagosHoy, transferenciasRecibidas, transferenciasEnviadas, ingresos, totalMembresias, totalUsuarios] = await Promise.all([
          prisma.cliente.count({ where: base }),
          prisma.cliente.count({ where: { ...base, estado: true } }),
          prisma.pago.count({ where: { cliente: base } }),
          prisma.pago.count({ where: { fecha_pago: { gte: hoy, lte: finDelDia }, cliente: base } }),
          prisma.solicitudTransferencia.count({ where: { gym_destino: base, estado: 'PENDIENTE' } }),
          prisma.solicitudTransferencia.count({ where: { gym_origen: base, estado: 'PENDIENTE' } }),
          prisma.pago.aggregate({ where: { cliente: base }, _sum: { monto: true } }),
          prisma.membresia.count({ where: base }),
          prisma.usuario.count({ where: base }),
        ])

        const asistenciasHoy = await asistenciaRepository.contarHoy(idGimnasio)
        const presentes = await asistenciaRepository.contarPresentes(idGimnasio)

        res.json({
          totalClientes,
          clientesActivos,
          clientesHoy: asistenciasHoy,
          totalPagos,
          pagosHoy,
          asistenciasHoy,
          presentes,
          transferenciasRecibidas,
          transferenciasEnviadas,
          ingresos: ingresos._sum.monto ?? 0,
          totalMembresias,
          totalUsuarios,
        })
        return
      }

      if (rol === 'Recepcionista') {
        const [clientesHoy, pagosHoy, membresiasPorVencer] = await Promise.all([
          prisma.cliente.count({ where: { ...base, fecha_registro: { gte: hoy, lte: finDelDia } } }),
          prisma.pago.count({ where: { fecha_pago: { gte: hoy, lte: finDelDia }, cliente: base } }),
          prisma.clienteMembresia.count({
            where: {
              cliente: base,
              estado: 'activo',
              fecha_fin: { gte: hoy, lte: new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000) },
            },
          }),
        ])

        const asistenciasHoy = await asistenciaRepository.contarHoy(idGimnasio)

        res.json({
          clientesHoy,
          pagosHoy,
          asistenciasHoy,
          membresiasPorVencer,
        })
        return
      }

      if (rol === 'Entrenador') {
        const idEnt = BigInt(idUsuario)
        const [misClientes, rutinasActivas] = await Promise.all([
          prisma.cliente.count({ where: { ...base, id_entrenador: idEnt } }),
          prisma.rutinaEntrenador.count({ where: { id_entrenador: idEnt, rutina: { estado: true } } }),
        ])

        const [presentes, notificaciones] = await Promise.all([
          asistenciaRepository.contarPresentesPorEntrenador(idEnt),
          prisma.notificacion.count({
            where: { id_usuario_destino: idEnt, leida: false },
          }),
        ])

        res.json({
          misClientes,
          rutinasActivas,
          clientesPresentesHoy: presentes,
          notificaciones,
        })
        return
      }

      res.json({})
    } catch (error) { next(error) }
  },
}
