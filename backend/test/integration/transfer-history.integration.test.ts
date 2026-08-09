import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let prisma: any
let transferenciaService: any
let asistenciaService: any
let origen: bigint
let destino: bigint
let adminOrigen: bigint
let adminDestino: bigint
let clienteId: bigint
let membresiaId: bigint
let pagoId: bigint
let asistenciaHistoricaId: bigint
let clienteRutinaId: bigint
let solicitudId: bigint

function requireIsolatedDatabase() {
  const raw = process.env.TEST_DATABASE_URL
  if (!raw) throw new Error('TEST_DATABASE_URL es obligatoria para integration tests')
  const url = new URL(raw)
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error(`Integration tests bloqueados fuera de localhost: ${url.hostname}`)
  }
  process.env.DATABASE_URL = raw
}

beforeAll(async () => {
  requireIsolatedDatabase()
  ;({ prisma } = await import('../../src/lib/prisma'))
  ;({ transferenciaService } = await import('../../src/services/transferencia.service'))
  ;({ asistenciaService } = await import('../../src/services/asistencia.service'))
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const gyms = await Promise.all([
    prisma.gimnasio.create({ data: { nombre: 'Origen integration', correo: `origen-${suffix}@test.invalid` } }),
    prisma.gimnasio.create({ data: { nombre: 'Destino integration', correo: `destino-${suffix}@test.invalid` } }),
  ])
  origen = gyms[0].id_gimnasio
  destino = gyms[1].id_gimnasio
  const admins = await Promise.all([
    prisma.usuario.create({ data: { id_gimnasio: origen, nombre: 'Admin', apellido: 'Origen', correo: `admin-o-${suffix}@test.invalid`, password_hash: 'test', rol: 'Administrador' } }),
    prisma.usuario.create({ data: { id_gimnasio: destino, nombre: 'Admin', apellido: 'Destino', correo: `admin-d-${suffix}@test.invalid`, password_hash: 'test', rol: 'Administrador' } }),
  ])
  adminOrigen = admins[0].id_usuario
  adminDestino = admins[1].id_usuario
  const cliente = await prisma.cliente.create({
    data: { id_gimnasio: origen, id_entrenador: adminOrigen, nombre: 'Cliente', apellido: 'Transferible', cedula: `ced-${suffix}`, correo: `cliente-${suffix}@test.invalid` },
  })
  clienteId = cliente.id_cliente
  const plan = await prisma.membresia.create({ data: { id_gimnasio: origen, nombre: 'Plan origen', precio: 25, duracion_dias: 30 } })
  const membresia = await prisma.clienteMembresia.create({
    data: { id_cliente: clienteId, id_membresia: plan.id_membresia, fecha_inicio: new Date('2026-08-01'), fecha_fin: new Date('2026-08-31'), estado: 'activo' },
  })
  membresiaId = membresia.id_cliente_membresia
  const pago = await prisma.pago.create({
    data: { id_gimnasio: origen, id_cliente: clienteId, id_cliente_membresia: membresiaId, monto: 25, metodo_pago: 'efectivo', estado: 'completado' },
  })
  pagoId = pago.id_pago
  const asistencia = await prisma.asistencia.create({
    data: { id_gimnasio: origen, id_cliente: clienteId, fecha_hora_ingreso: new Date('2026-08-08T14:00:00Z'), fecha_hora_salida: new Date('2026-08-08T15:00:00Z') },
  })
  asistenciaHistoricaId = asistencia.id_asistencia
  const rutina = await prisma.rutina.create({ data: { id_gimnasio: origen, id_usuario_creador: adminOrigen, nombre: 'Rutina origen' } })
  const asignacion = await prisma.clienteRutina.create({
    data: { id_cliente: clienteId, id_rutina: rutina.id_rutina, id_entrenador_asignador: adminOrigen, fecha_asignacion: new Date(), estado: 'activa' },
  })
  clienteRutinaId = asignacion.id_cliente_rutina
})

afterAll(async () => {
  if (!prisma || !origen) return
  await prisma.notificacion.deleteMany({ where: { OR: [{ id_gimnasio: origen }, { id_gimnasio: destino }] } })
  await prisma.solicitudTransferencia.deleteMany({ where: { id_cliente: clienteId } })
  await prisma.clienteRutina.deleteMany({ where: { id_cliente: clienteId } })
  await prisma.rutina.deleteMany({ where: { id_gimnasio: origen } })
  await prisma.pago.deleteMany({ where: { id_cliente: clienteId } })
  await prisma.asistencia.deleteMany({ where: { id_cliente: clienteId } })
  await prisma.clienteMembresia.deleteMany({ where: { id_cliente: clienteId } })
  await prisma.membresia.deleteMany({ where: { id_gimnasio: origen } })
  await prisma.cliente.delete({ where: { id_cliente: clienteId } })
  await prisma.usuario.deleteMany({ where: { id_gimnasio: { in: [origen, destino] } } })
  await prisma.gimnasio.deleteMany({ where: { id_gimnasio: { in: [origen, destino] } } })
  await prisma.$disconnect()
})

describe('transferencia y propiedad histórica en PostgreSQL real', () => {
  it('impide dos entradas abiertas concurrentes y devuelve conflicto', async () => {
    const results = await Promise.allSettled([
      asistenciaService.registrarEntrada(origen, { id_cliente: Number(clienteId) }),
      asistenciaService.registrarEntrada(origen, { id_cliente: Number(clienteId) }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((result) => result.status === 'rejected') as PromiseRejectedResult
    expect(rejected.reason.statusCode).toBe(409)
    const abierta = await prisma.asistencia.findFirst({ where: { id_cliente: clienteId, fecha_hora_salida: null } })
    await asistenciaService.registrarSalida(origen, { id_asistencia: Number(abierta.id_asistencia) })
  })

  it('aprueba atómicamente y conserva pagos/asistencias en el gimnasio de origen', async () => {
    const solicitud = await transferenciaService.crear(destino, { id_cliente: Number(clienteId), motivo: 'Cambio de sede' }, Number(adminDestino))
    solicitudId = solicitud.id
    await transferenciaService.aprobar(solicitudId, origen, Number(adminOrigen), 'Aprobada')

    const [cliente, membresia, asignacion, pago, asistencia, origenPagos, destinoPagos] = await Promise.all([
      prisma.cliente.findUnique({ where: { id_cliente: clienteId } }),
      prisma.clienteMembresia.findUnique({ where: { id_cliente_membresia: membresiaId } }),
      prisma.clienteRutina.findUnique({ where: { id_cliente_rutina: clienteRutinaId } }),
      prisma.pago.findUnique({ where: { id_pago: pagoId } }),
      prisma.asistencia.findUnique({ where: { id_asistencia: asistenciaHistoricaId } }),
      prisma.pago.count({ where: { id_gimnasio: origen, id_cliente: clienteId } }),
      prisma.pago.count({ where: { id_gimnasio: destino, id_cliente: clienteId } }),
    ])
    expect(cliente).toMatchObject({ id_gimnasio: destino, id_entrenador: null, estado: true })
    expect(membresia.estado).toBe('cancelada')
    expect(asignacion.estado).toBe('archivada')
    expect(pago.id_gimnasio).toBe(origen)
    expect(asistencia.id_gimnasio).toBe(origen)
    expect(origenPagos).toBe(1)
    expect(destinoPagos).toBe(0)
  })
})
