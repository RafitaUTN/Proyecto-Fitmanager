import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let prisma: any
let notificacionService: any
let gymId: bigint
let clienteId: bigint
let clienteMembresiaId: bigint

function businessTodayUtc() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).map((part) => [part.type, part.value]))
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`)
}

function requireIsolatedDatabase() {
  const raw = process.env.TEST_DATABASE_URL
  if (!raw) throw new Error('TEST_DATABASE_URL es obligatoria para integration tests')
  const url = new URL(raw)
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(url.hostname)) throw new Error('Integration tests requieren una base local o de Docker Compose')
  process.env.DATABASE_URL = raw
}

beforeAll(async () => {
  requireIsolatedDatabase()
  ;({ prisma } = await import('../../src/lib/prisma'))
  ;({ notificacionService } = await import('../../src/services/notificacion.service'))
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const gym = await prisma.gimnasio.create({ data: { nombre: 'Notif integration', correo: `notif-${suffix}@test.invalid` } })
  gymId = gym.id_gimnasio
  const cliente = await prisma.cliente.create({
    data: { id_gimnasio: gymId, nombre: 'Cliente', apellido: 'Notif', cedula: `notif-${suffix}`, correo: `cliente-notif-${suffix}@test.invalid` },
  })
  clienteId = cliente.id_cliente
  const plan = await prisma.membresia.create({ data: { id_gimnasio: gymId, nombre: 'Plan notif', precio: 10, duracion_dias: 7 } })
  const hoy = businessTodayUtc()
  const asignacion = await prisma.clienteMembresia.create({
    data: {
      id_cliente: clienteId,
      id_membresia: plan.id_membresia,
      fecha_inicio: hoy,
      fecha_fin: new Date(hoy.getTime() + 5 * 86400000),
      monto_adeudado: 10,
      fecha_pago_habilitada: hoy,
      fecha_vencimiento_pago: new Date(hoy.getTime() + 5 * 86400000),
      estado: 'activo',
    },
  })
  clienteMembresiaId = asignacion.id_cliente_membresia
})

afterAll(async () => {
  if (!prisma || !gymId) return
  await prisma.notificacion.deleteMany({ where: { OR: [{ id_gimnasio: gymId }, { id_cliente: clienteId }] } })
  await prisma.emailOutbox.deleteMany({ where: { event_key: { startsWith: `pago-disponible:${clienteMembresiaId}:` } } })
  await prisma.clienteMembresia.deleteMany({ where: { id_cliente: clienteId } })
  await prisma.membresia.deleteMany({ where: { id_gimnasio: gymId } })
  await prisma.cliente.delete({ where: { id_cliente: clienteId } })
  await prisma.gimnasio.delete({ where: { id_gimnasio: gymId } })
  await prisma.$disconnect()
})

describe('entrega idempotente de notificaciones', () => {
  it('genera una vez por evento/destinatario aunque se invoque repetidamente', async () => {
    expect(await notificacionService.generarAlertas(gymId)).toEqual({ generadas: 1 })
    expect(await notificacionService.generarAlertas(gymId)).toEqual({ generadas: 0 })
    expect(await prisma.notificacion.count({ where: { OR: [{ id_gimnasio: gymId }, { id_cliente: clienteId }] } })).toBe(1)
    expect(await prisma.emailOutbox.count({ where: { event_key: { startsWith: `pago-disponible:${clienteMembresiaId}:` } } })).toBe(1)
  })

  it('la base rechaza notificaciones sin destinatario', async () => {
    await expect(prisma.notificacion.create({ data: { titulo: 'Sin receptor', mensaje: 'inválida', tipo: 'SISTEMA' } })).rejects.toBeTruthy()
  })
})
