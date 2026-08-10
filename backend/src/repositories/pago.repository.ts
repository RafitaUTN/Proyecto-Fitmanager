import { prisma } from '../lib/prisma'

export type PagoDb = Pick<typeof prisma, 'pago'>

export const pagoRepository = {
  listarPorGimnasio(idGimnasio: bigint, idCliente?: bigint) {
    return prisma.pago.findMany({
      where: {
        id_gimnasio: idGimnasio,
        ...(idCliente ? { id_cliente: idCliente } : {}),
      },
      include: {
        cliente: { select: { nombre: true, apellido: true, cedula: true } },
        cliente_membresia: { include: { membresia: { select: { nombre: true } } } },
      },
      orderBy: { fecha_pago: 'desc' },
    })
  },

  crear(data: { id_gimnasio: bigint; id_cliente: bigint; id_cliente_membresia: bigint; monto: number; metodo_pago: string; estado: string }, db: PagoDb = prisma) {
    return db.pago.create({ data })
  },
}
