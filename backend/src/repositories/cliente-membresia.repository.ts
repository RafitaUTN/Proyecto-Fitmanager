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
  // El indice parcial idx_cliente_membresia_activa garantiza como maximo una
  // membresia activa por cliente, asi que filtrar por estado ya devuelve una
  // fila por cliente: no hace falta deduplicar despues.
  listarRecientes(idGimnasio: bigint, pagina = 1, limite = 20, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.findMany({
      where: { estado: 'activo', cliente: { id_gimnasio: idGimnasio } },
      include: {
        membresia: { select: { id_membresia: true, nombre: true, precio: true, duracion_dias: true } },
        cliente: { select: { id_cliente: true, nombre: true, apellido: true, cedula: true, entrenador: { select: { id_usuario: true, nombre: true, apellido: true } } } },
      },
      orderBy: { fecha_inicio: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    })
  },

  contarRecientes(idGimnasio: bigint, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.count({ where: { estado: 'activo', cliente: { id_gimnasio: idGimnasio } } })
  },
  // Obligaciones vigentes del gimnasio, las mas proximas a vencer primero.
  // Alimenta las sugerencias de cobro; el limite acota el calculo de saldos.
  listarActivasConCliente(idGimnasio: bigint, limite = 100, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.findMany({
      where: { estado: 'activo', cliente: { id_gimnasio: idGimnasio, estado: true } },
      include: {
        membresia: { select: { nombre: true } },
        cliente: { select: { id_cliente: true, nombre: true, apellido: true, cedula: true } },
      },
      orderBy: { fecha_vencimiento_pago: 'asc' },
      take: limite,
    })
  },
  buscarPorId(id: bigint, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.findUnique({ where: { id_cliente_membresia: id } })
  },
  crear(data: {
    id_cliente: bigint
    id_membresia: bigint
    fecha_inicio: Date
    fecha_fin: Date
    monto_adeudado: number
    fecha_pago_habilitada: Date
    fecha_vencimiento_pago: Date
    estado: string
  }, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.create({ data })
  },
  actualizarEstado(id: bigint, estado: string, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.update({ where: { id_cliente_membresia: id }, data: { estado } })
  },
  extender(
    id: bigint,
    data: { fecha_fin: Date; monto_adeudado: number; fecha_pago_habilitada: Date; fecha_vencimiento_pago: Date },
    db: ClienteMembresiaDb = prisma,
  ) {
    return db.clienteMembresia.update({ where: { id_cliente_membresia: id }, data })
  },
}
