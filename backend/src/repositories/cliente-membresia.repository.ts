import { prisma } from '../lib/prisma'

export const clienteMembresiaRepository = {
  listarPorCliente(idCliente: bigint) {
    return prisma.clienteMembresia.findMany({
      where: { id_cliente: idCliente },
      include: { membresia: true },
      orderBy: { fecha_inicio: 'desc' },
    })
  },

  listarPorGimnasio(idGimnasio: bigint) {
    return prisma.clienteMembresia.findMany({
      where: { cliente: { id_gimnasio: idGimnasio } },
      include: { membresia: true, cliente: true },
      orderBy: { fecha_inicio: 'desc' },
    })
  },

  buscarPorId(id: bigint) {
    return prisma.clienteMembresia.findUnique({ where: { id_cliente_membresia: id } })
  },

  crear(data: { id_cliente: bigint; id_membresia: bigint; fecha_inicio: Date; fecha_fin: Date; estado: string }) {
    return prisma.clienteMembresia.create({ data })
  },

  actualizarEstado(id: bigint, estado: string) {
    return prisma.clienteMembresia.update({ where: { id_cliente_membresia: id }, data: { estado } })
  },
}
