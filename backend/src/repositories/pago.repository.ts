import { prisma } from '../lib/prisma'

export const pagoRepository = {
  listarPorGimnasio(idGimnasio: bigint) {
    return prisma.pago.findMany({
      where: { cliente: { id_gimnasio: idGimnasio } },
      include: {
        cliente: { select: { nombre: true, apellido: true, cedula: true } },
        cliente_membresia: { include: { membresia: { select: { nombre: true } } } },
      },
      orderBy: { fecha_pago: 'desc' },
    })
  },

  crear(data: { id_cliente: bigint; id_cliente_membresia: bigint; monto: number; metodo_pago: string; estado: string }) {
    return prisma.pago.create({ data })
  },
}
