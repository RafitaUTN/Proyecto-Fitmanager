/**
 * Servicio de negocio del módulo dashboard.service.
 *
 * @remarks Contiene reglas del dominio FitManager y coordina repositorios, transacciones y efectos secundarios.
 */
import { prisma } from '../lib/prisma'
import { asistenciaRepository } from '../repositories/asistencia.repository'
import { cached, TtlCache } from '../lib/ttl-cache'

const DASHBOARD_CACHE_TTL_MS = Number(process.env.DASHBOARD_CACHE_TTL_MS || '30000')
const dashboardCache = new TtlCache<Record<string, unknown>>(200)

/**
 * Calcula los indicadores del dashboard según el rol autenticado.
 *
 * Centraliza las consultas de agregación para que el controlador solo maneje
 * request/response. Cada consulta se limita por `idGimnasio`, evitando mezclar
 * métricas entre gimnasios en un entorno multi-tenant.
 *
 * @param idGimnasio - Identificador del gimnasio activo obtenido del token.
 * @param rol - Rol del usuario autenticado.
 * @param idUsuario - Identificador del usuario cuando se requieren métricas personales.
 * @returns Objeto con los indicadores visibles para el rol indicado.
 */
async function obtenerIndicadores(idGimnasio: bigint, rol: string, idUsuario: string | number | bigint) {
  const cacheKey = `dashboard:${idGimnasio.toString()}:${rol}:${idUsuario.toString()}`
  return cached(dashboardCache, cacheKey, DASHBOARD_CACHE_TTL_MS, () =>
    calcularIndicadores(idGimnasio, rol, idUsuario),
  )
}

async function calcularIndicadores(idGimnasio: bigint, rol: string, idUsuario: string | number | bigint) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const finDelDia = new Date(hoy)
  finDelDia.setHours(23, 59, 59, 999)

  const base = { id_gimnasio: idGimnasio }

  if (rol === 'Administrador') {
    const [
      totalClientes,
      clientesActivos,
      totalPagos,
      pagosHoy,
      transferenciasRecibidas,
      transferenciasEnviadas,
      ingresos,
      totalMembresias,
      totalUsuarios,
      asistenciasHoy,
      presentes,
    ] = await Promise.all([
      prisma.cliente.count({ where: base }),
      prisma.cliente.count({ where: { ...base, estado: true } }),
      prisma.pago.count({ where: base }),
      prisma.pago.count({ where: { fecha_pago: { gte: hoy, lte: finDelDia }, ...base } }),
      prisma.solicitudTransferencia.count({ where: { gym_destino: base, estado: 'PENDIENTE' } }),
      prisma.solicitudTransferencia.count({ where: { gym_origen: base, estado: 'PENDIENTE' } }),
      prisma.pago.aggregate({ where: base, _sum: { monto: true } }),
      prisma.membresia.count({ where: base }),
      prisma.usuario.count({ where: base }),
      asistenciaRepository.contarHoy(idGimnasio),
      asistenciaRepository.contarPresentes(idGimnasio),
    ])

    return {
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
    }
  }

  if (rol === 'Recepcionista') {
    const [clientesHoy, pagosHoy, membresiasPorVencer, asistenciasHoy] = await Promise.all([
      prisma.cliente.count({ where: { ...base, fecha_registro: { gte: hoy, lte: finDelDia } } }),
      prisma.pago.aggregate({ where: { fecha_pago: { gte: hoy, lte: finDelDia }, ...base }, _sum: { monto: true } }),
      prisma.clienteMembresia.count({
        where: {
          cliente: base,
          estado: 'activo',
          fecha_fin: { gte: hoy, lte: new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      asistenciaRepository.contarHoy(idGimnasio),
    ])

    return {
      clientesHoy,
      pagosHoy: pagosHoy._sum.monto ?? 0,
      asistenciasHoy,
      membresiasPorVencer,
    }
  }

  if (rol === 'Entrenador') {
    const idEntrenador = BigInt(idUsuario)
    const [misClientes, rutinasActivas] = await Promise.all([
      prisma.cliente.count({
        where: {
          ...base,
          id_entrenador: idEntrenador,
          cliente_membresias: { some: { estado: 'activo' } },
        },
      }),
      prisma.rutinaEntrenador.count({ where: { id_entrenador: idEntrenador, rutina: { estado: true } } }),
    ])

    const [presentes, notificaciones] = await Promise.all([
      asistenciaRepository.contarPresentesPorEntrenador(idEntrenador, idGimnasio),
      prisma.notificacion.count({ where: { id_usuario_destino: idEntrenador, leida: false } }),
    ])

    return {
      misClientes,
      rutinasActivas,
      clientesPresentesHoy: presentes,
      notificaciones,
    }
  }

  return {}
}

function invalidar(idGimnasio: bigint) {
  dashboardCache.deletePrefix(`dashboard:${idGimnasio.toString()}:`)
}

export const dashboardService = { obtenerIndicadores, invalidar }
