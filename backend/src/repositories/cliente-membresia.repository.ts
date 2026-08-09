import { prisma } from '../lib/prisma'

export type ClienteMembresiaDb = Pick<typeof prisma, 'clienteMembresia'>

export const clienteMembresiaRepository = {
  listarPorCliente(idCliente: bigint, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.findMany({
      where: { id_cliente: idCliente },
      include: { membresia: true },
      orderBy: { fecha_inicio: 'desc' },
    })
  },
  listarActivaPorCliente(idCliente: bigint, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.findFirst({ where: { id_cliente: idCliente, estado: 'activo' } })
  },
  listarPorGimnasio(idGimnasio: bigint, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.findMany({
      where: { cliente: { id_gimnasio: idGimnasio } },
      include: { membresia: true, cliente: true },
      orderBy: { fecha_inicio: 'desc' },
    })
  },
  listarRecientes(idGimnasio: bigint, limite = 15, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.findMany({
      where: { cliente: { id_gimnasio: idGimnasio } },
      include: {
        membresia: { select: { id_membresia: true, nombre: true, precio: true, duracion_dias: true } },
        cliente: { select: { id_cliente: true, nombre: true, apellido: true, cedula: true, entrenador: { select: { id_usuario: true, nombre: true, apellido: true } } } },
      },
      orderBy: { fecha_inicio: 'desc' },
      take: limite,
    })
  },
  buscarPorId(id: bigint, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.findUnique({ where: { id_cliente_membresia: id } })
  },
  crear(data: { id_cliente: bigint; id_membresia: bigint; fecha_inicio: Date; fecha_fin: Date; estado: string }, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.create({ data })
  },
  actualizarEstado(id: bigint, estado: string, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.update({ where: { id_cliente_membresia: id }, data: { estado } })
  },
  extender(id: bigint, fechaFin: Date, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.update({ where: { id_cliente_membresia: id }, data: { fecha_fin: fechaFin } })
  },
}
