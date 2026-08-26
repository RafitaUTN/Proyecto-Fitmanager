/**
 * Repositorio de datos del módulo pago.repository.
 *
 * @remarks Encapsula consultas Prisma y preserva la separación entre acceso a datos y reglas de negocio.
 */
import { prisma } from '../lib/prisma'

export type PagoDb = Pick<typeof prisma, 'pago'>
const ESTADOS_CONFIRMADOS = ['completado', 'confirmado']

export const pagoRepository = {
  listarPorGimnasio(idGimnasio: bigint, idCliente?: bigint, fechaInicio?: Date, fechaFin?: Date, search?: string) {
    return prisma.pago.findMany({
      where: {
        id_gimnasio: idGimnasio,
        ...(idCliente ? { id_cliente: idCliente } : {}),
        ...(fechaInicio || fechaFin
          ? {
              fecha_pago: {
                ...(fechaInicio ? { gte: fechaInicio } : {}),
                ...(fechaFin ? { lte: fechaFin } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { cliente: { nombre: { contains: search, mode: 'insensitive' } } },
                { cliente: { apellido: { contains: search, mode: 'insensitive' } } },
                { cliente: { cedula: { contains: search } } },
                { referencia_pago: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
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
        obligacion_pago: {
          select: {
            periodo_inicio: true,
            periodo_fin: true,
            monto_total: true,
            estado: true,
            tipo: true,
          },
        },
      },
      orderBy: { fecha_pago: 'desc' },
    })
  },

  async listarPorGimnasioPaginado(
    idGimnasio: bigint,
    page: number,
    pageSize: number,
    idCliente?: bigint,
    fechaInicio?: Date,
    fechaFin?: Date,
    search?: string,
  ) {
    const where: any = {
      id_gimnasio: idGimnasio,
      ...(idCliente ? { id_cliente: idCliente } : {}),
      ...(fechaInicio || fechaFin
        ? {
            fecha_pago: {
              ...(fechaInicio ? { gte: fechaInicio } : {}),
              ...(fechaFin ? { lte: fechaFin } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { cliente: { nombre: { contains: search, mode: 'insensitive' } } },
              { cliente: { apellido: { contains: search, mode: 'insensitive' } } },
              { cliente: { cedula: { contains: search } } },
              { referencia_pago: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const include = {
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
      obligacion_pago: {
        select: {
          periodo_inicio: true,
          periodo_fin: true,
          monto_total: true,
          estado: true,
          tipo: true,
        },
      },
    }
    const [data, totalItems] = await Promise.all([
      prisma.pago.findMany({
        where,
        include,
        orderBy: { fecha_pago: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.pago.count({ where }),
    ])
    return { data, totalItems }
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

  buscarReferencia(idGimnasio: bigint, metodoPago: string, referenciaPago: string, db: PagoDb = prisma) {
    return db.pago.findFirst({
      where: {
        id_gimnasio: idGimnasio,
        metodo_pago: metodoPago,
        referencia_pago: referenciaPago,
        estado: { in: ESTADOS_CONFIRMADOS },
      },
      select: { id_pago: true },
    })
  },

  crear(
    data: {
      id_gimnasio: bigint
      id_cliente: bigint
      id_cliente_membresia: bigint
      id_obligacion_pago?: bigint | null
      monto: number
      metodo_pago: string
      referencia_pago?: string | null
      estado: string
    },
    db: PagoDb = prisma,
  ) {
    return db.pago.create({ data })
  },
}
