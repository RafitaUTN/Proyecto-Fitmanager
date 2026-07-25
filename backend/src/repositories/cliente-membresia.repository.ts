import { prisma } from '../lib/prisma'

export const clienteMembresiaRepository = {
  _client(tx?: any) {
    return tx || prisma
  },

  listarPorCliente(idCliente: bigint, tx?: any) {
    return this._client(tx).clienteMembresia.findMany({
      where: { id_cliente: idCliente },
      include: { membresia: true },
      orderBy: { fecha_inicio: 'desc' },
    })
  },

  listarActivaPorCliente(idCliente: bigint, tx?: any) {
    return this._client(tx).clienteMembresia.findFirst({
      where: { id_cliente: idCliente, estado: 'activo' },
    })
  },

  listarPorGimnasio(idGimnasio: bigint, tx?: any) {
    return this._client(tx).clienteMembresia.findMany({
      where: { cliente: { id_gimnasio: idGimnasio } },
      include: { membresia: true, cliente: true },
      orderBy: { fecha_inicio: 'desc' },
    })
  },

  listarRecientes(idGimnasio: bigint, limite = 15, tx?: any) {
    return this._client(tx).clienteMembresia.findMany({
      where: { cliente: { id_gimnasio: idGimnasio } },
      include: {
        membresia: { select: { id_membresia: true, nombre: true, precio: true, duracion_dias: true } },
        cliente: {
          select: {
            id_cliente: true,
            nombre: true,
            apellido: true,
            cedula: true,
            entrenador: { select: { id_usuario: true, nombre: true, apellido: true } },
          },
        },
      },
      orderBy: { fecha_inicio: 'desc' },
      take: limite,
    })
  },

  buscarPorId(id: bigint, tx?: any) {
    return this._client(tx).clienteMembresia.findUnique({ where: { id_cliente_membresia: id } })
  },

  crear(data: { id_cliente: bigint; id_membresia: bigint; fecha_inicio: Date; fecha_fin: Date; estado: string }, tx?: any) {
    return this._client(tx).clienteMembresia.create({ data })
  },

  actualizarEstado(id: bigint, estado: string, tx?: any) {
    return this._client(tx).clienteMembresia.update({ where: { id_cliente_membresia: id }, data: { estado } })
  },
}
