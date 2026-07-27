import { prisma } from '../lib/prisma'

type RawRow = Record<string, unknown>

export const reporteRepository = {
  async ingresosMensuales(idGimnasio: bigint, inicio: Date, fin: Date) {
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        DATE_TRUNC('month', p.fecha_pago) AS mes,
        COALESCE(SUM(p.monto), 0) AS total,
        COUNT(*) AS cantidad
      FROM pago p
      JOIN cliente c ON p.id_cliente = c.id_cliente
      WHERE c.id_gimnasio = ${idGimnasio}
        AND p.fecha_pago >= ${inicio}
        AND p.fecha_pago <= ${fin}
      GROUP BY DATE_TRUNC('month', p.fecha_pago)
      ORDER BY mes ASC
    `
    return rows.map(r => ({ mes: r.mes as Date, total: Number(r.total), cantidad: Number(r.cantidad) }))
  },

  async nuevosClientes(idGimnasio: bigint, inicio: Date, fin: Date) {
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        DATE_TRUNC('month', fecha_registro) AS mes,
        COUNT(*) AS cantidad
      FROM cliente
      WHERE id_gimnasio = ${idGimnasio}
        AND fecha_registro >= ${inicio}
        AND fecha_registro <= ${fin}
      GROUP BY DATE_TRUNC('month', fecha_registro)
      ORDER BY mes ASC
    `
    return rows.map(r => ({ mes: r.mes as Date, cantidad: Number(r.cantidad) }))
  },

  async asistencias(idGimnasio: bigint, inicio: Date, fin: Date) {
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        DATE_TRUNC('month', a.fecha_hora_ingreso) AS mes,
        COUNT(*) AS cantidad
      FROM asistencia a
      JOIN cliente c ON a.id_cliente = c.id_cliente
      WHERE c.id_gimnasio = ${idGimnasio}
        AND a.fecha_hora_ingreso >= ${inicio}
        AND a.fecha_hora_ingreso <= ${fin}
      GROUP BY DATE_TRUNC('month', a.fecha_hora_ingreso)
      ORDER BY mes ASC
    `
    return rows.map(r => ({ mes: r.mes as Date, cantidad: Number(r.cantidad) }))
  },

  async distribucionMembresias(idGimnasio: bigint) {
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        m.nombre,
        COUNT(cm.id_cliente_membresia) AS total
      FROM membresia m
      LEFT JOIN cliente_membresia cm ON m.id_membresia = cm.id_membresia
        AND cm.estado = 'activo'
      WHERE m.id_gimnasio = ${idGimnasio}
      GROUP BY m.id_membresia, m.nombre
      ORDER BY total DESC
    `
    return rows.map(r => ({ nombre: r.nombre as string, total: Number(r.total) }))
  },

  async metodosPago(idGimnasio: bigint, inicio: Date, fin: Date) {
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        p.metodo_pago,
        COUNT(*) AS cantidad,
        COALESCE(SUM(p.monto), 0) AS total
      FROM pago p
      JOIN cliente c ON p.id_cliente = c.id_cliente
      WHERE c.id_gimnasio = ${idGimnasio}
        AND p.fecha_pago >= ${inicio}
        AND p.fecha_pago <= ${fin}
      GROUP BY p.metodo_pago
      ORDER BY total DESC
    `
    return rows.map(r => ({ metodo_pago: r.metodo_pago as string, cantidad: Number(r.cantidad), total: Number(r.total) }))
  },

  async ingresosDiarios(idGimnasio: bigint, inicio: Date, fin: Date) {
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        DATE_TRUNC('day', p.fecha_pago) AS dia,
        COALESCE(SUM(p.monto), 0) AS total,
        COUNT(*) AS cantidad
      FROM pago p
      JOIN cliente c ON p.id_cliente = c.id_cliente
      WHERE c.id_gimnasio = ${idGimnasio}
        AND p.fecha_pago >= ${inicio}
        AND p.fecha_pago <= ${fin}
      GROUP BY DATE_TRUNC('day', p.fecha_pago)
      ORDER BY dia ASC
    `
    return rows.map(r => ({ dia: r.dia as Date, total: Number(r.total), cantidad: Number(r.cantidad) }))
  },

  async asistenciasPorHora(idGimnasio: bigint, inicio: Date, fin: Date) {
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        EXTRACT(HOUR FROM a.fecha_hora_ingreso)::int AS hora,
        COUNT(*) AS cantidad
      FROM asistencia a
      JOIN cliente c ON a.id_cliente = c.id_cliente
      WHERE c.id_gimnasio = ${idGimnasio}
        AND a.fecha_hora_ingreso >= ${inicio}
        AND a.fecha_hora_ingreso <= ${fin}
      GROUP BY EXTRACT(HOUR FROM a.fecha_hora_ingreso)
      ORDER BY hora ASC
    `
    return rows.map(r => ({ hora: Number(r.hora), cantidad: Number(r.cantidad) }))
  },

  async clientesActivosVsInactivos(idGimnasio: bigint) {
    const [activos, inactivos] = await Promise.all([
      prisma.cliente.count({ where: { id_gimnasio: idGimnasio, estado: true } }),
      prisma.cliente.count({ where: { id_gimnasio: idGimnasio, estado: false } }),
    ])
    return { activos, inactivos }
  },

  async exportar(idGimnasio: bigint, tipo: string, inicio: Date, fin: Date) {
    let rows: Record<string, unknown>[]

    switch (tipo) {
      case 'ingresos-mensuales': {
        const data = await this.ingresosMensuales(idGimnasio, inicio, fin)
        rows = data as unknown as Record<string, unknown>[]
        return csvLine(['Mes', 'Total', 'Cantidad']) + '\n' + data.map(r => csvLine([fmtMes(r.mes), String(r.total), String(r.cantidad)])).join('\n')
      }
      case 'nuevos-clientes': {
        const data = await this.nuevosClientes(idGimnasio, inicio, fin)
        rows = data as unknown as Record<string, unknown>[]
        return csvLine(['Mes', 'Cantidad']) + '\n' + data.map(r => csvLine([fmtMes(r.mes), String(r.cantidad)])).join('\n')
      }
      case 'asistencias': {
        const data = await this.asistencias(idGimnasio, inicio, fin)
        rows = data as unknown as Record<string, unknown>[]
        return csvLine(['Mes', 'Cantidad']) + '\n' + data.map(r => csvLine([fmtMes(r.mes), String(r.cantidad)])).join('\n')
      }
      case 'distribucion-membresias': {
        const data = await this.distribucionMembresias(idGimnasio)
        rows = data as unknown as Record<string, unknown>[]
        return csvLine(['Plan', 'Total']) + '\n' + data.map(r => csvLine([String(r.nombre), String(r.total)])).join('\n')
      }
      case 'metodos-pago': {
        const data = await this.metodosPago(idGimnasio, inicio, fin)
        rows = data as unknown as Record<string, unknown>[]
        return csvLine(['Metodo', 'Cantidad', 'Total']) + '\n' + data.map(r => csvLine([String(r.metodo_pago), String(r.cantidad), String(r.total)])).join('\n')
      }
      case 'ingresos-diarios': {
        const data = await this.ingresosDiarios(idGimnasio, inicio, fin)
        rows = data as unknown as Record<string, unknown>[]
        return csvLine(['Dia', 'Total', 'Cantidad']) + '\n' + data.map(r => csvLine([fmtDia(r.dia), String(r.total), String(r.cantidad)])).join('\n')
      }
      case 'asistencias-por-hora': {
        const data = await this.asistenciasPorHora(idGimnasio, inicio, fin)
        rows = data as unknown as Record<string, unknown>[]
        return csvLine(['Hora', 'Cantidad']) + '\n' + data.map(r => csvLine([`${r.hora}:00`, String(r.cantidad)])).join('\n')
      }
      case 'clientes-activos-inactivos': {
        const data = await this.clientesActivosVsInactivos(idGimnasio)
        return csvLine(['Tipo', 'Cantidad']) + '\n' + csvLine(['Activos', String(data.activos)]) + '\n' + csvLine(['Inactivos', String(data.inactivos)])
      }
      default:
        return ''
    }
  },
}

function csvCell(val: string): string {
  if (/[,"\n]/.test(val)) return `"${val.replace(/"/g, '""')}"`
  return val
}

function csvLine(vals: string[]): string {
  return vals.map(csvCell).join(',')
}

function fmtDia(d: Date | unknown): string {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(String(d))
  return date.toISOString().split('T')[0]
}

function fmtMes(d: Date | unknown): string {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(String(d))
  return date.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })
}
