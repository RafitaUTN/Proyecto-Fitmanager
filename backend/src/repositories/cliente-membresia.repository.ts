/**
 * Repositorio de datos del módulo cliente-membresia.repository.
 *
 * @remarks Encapsula consultas Prisma y preserva la separación entre acceso a datos y reglas de negocio.
 */
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
  async listarPorGimnasioPaginado(
    idGimnasio: bigint,
    page: number,
    pageSize: number,
    search?: string,
    db: ClienteMembresiaDb = prisma,
  ) {
    const where: any = {
      cliente: {
        id_gimnasio: idGimnasio,
        ...(search
          ? {
              OR: [
                { nombre: { contains: search, mode: 'insensitive' } },
                { apellido: { contains: search, mode: 'insensitive' } },
                { cedula: { contains: search } },
              ],
            }
          : {}),
      },
    }
    const [data, totalItems] = await Promise.all([
      db.clienteMembresia.findMany({
        where,
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.clienteMembresia.count({ where }),
    ])
    return { data, totalItems }
  },
  listarRecientes(idGimnasio: bigint, limite = 15, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.findMany({
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
  buscarPorId(id: bigint, db: ClienteMembresiaDb = prisma) {
    return db.clienteMembresia.findUnique({ where: { id_cliente_membresia: id } })
  },
  crear(
    data: {
      id_cliente: bigint
      id_membresia: bigint
      fecha_inicio: Date
      fecha_fin: Date
      monto_adeudado: number
      fecha_pago_habilitada: Date
      fecha_vencimiento_pago: Date
      estado: string
    },
    db: ClienteMembresiaDb = prisma,
  ) {
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
