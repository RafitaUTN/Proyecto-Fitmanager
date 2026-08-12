import { prisma } from '../lib/prisma'

export type PagoDb = Pick<typeof prisma, 'pago'>
const ESTADOS_CONFIRMADOS = ['completado', 'confirmado']

export const pagoRepository = {
  listarPorGimnasio(idGimnasio: bigint, idCliente?: bigint, fechaInicio?: Date, fechaFin?: Date) {
    return prisma.pago.findMany({
      where: {
        id_gimnasio: idGimnasio,
        ...(idCliente ? { id_cliente: idCliente } : {}),
        ...(fechaInicio || fechaFin ? {
          fecha_pago: {
            ...(fechaInicio ? { gte: fechaInicio } : {}),
            ...(fechaFin ? { lte: fechaFin } : {}),
          },
        } : {}),
      },
      include: {
        cliente: { select: { nombre: true, apellido: true, cedula: true } },
        cliente_membresia: {
          select: {
            monto_adeudado: true,
            fecha_inicio: true,
            fecha_vencimiento_pago: true,
            estado: true,
            membresia: { select: { nombre: true } },
          },
        },
      },
      orderBy: { fecha_pago: 'desc' },
    })
  },

  listarConfirmadosPorObligaciones(idGimnasio: bigint, ids: bigint[]) {
    if (ids.length === 0) return Promise.resolve([])
    return prisma.pago.findMany({
      where: {
        id_gimnasio: idGimnasio,
        id_cliente_membresia: { in: ids },
        estado: { in: ESTADOS_CONFIRMADOS },
      },
      select: { id_pago: true, id_cliente_membresia: true, monto: true, fecha_pago: true },
      orderBy: [{ id_cliente_membresia: 'asc' }, { fecha_pago: 'asc' }, { id_pago: 'asc' }],
    })
  },

  crear(data: { id_gimnasio: bigint; id_cliente: bigint; id_cliente_membresia: bigint; monto: number; metodo_pago: string; estado: string }, db: PagoDb = prisma) {
    return db.pago.create({ data })
  },
}
