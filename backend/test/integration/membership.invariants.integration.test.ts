import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let prisma: any
let service: any
let gymId: bigint
let planId: bigint
const clientIds: bigint[] = []

function requireIsolatedDatabase() {
  const raw = process.env.TEST_DATABASE_URL
  if (!raw) throw new Error('TEST_DATABASE_URL es obligatoria para integration tests')
  const url = new URL(raw)
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(url.hostname)) {
    throw new Error(`Integration tests bloqueados fuera de localhost: ${url.hostname}`)
  }
  process.env.DATABASE_URL = raw
}

beforeAll(async () => {
  requireIsolatedDatabase()
  ;({ prisma } = await import('../../src/lib/prisma'))
  ;({ clienteMembresiaService: service } = await import('../../src/services/cliente-membresia.service'))

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const gym = await prisma.gimnasio.create({
    data: { nombre: 'Integration Gym', correo: `integration-${suffix}@test.invalid` },
  })
  gymId = gym.id_gimnasio
  const plan = await prisma.membresia.create({
    data: { id_gimnasio: gymId, nombre: 'Plan integration', precio: 10, duracion_dias: 30 },
  })
  planId = plan.id_membresia
})

afterAll(async () => {
  if (!prisma || !gymId) return
  await prisma.notificacion.deleteMany({
    where: { OR: [{ id_gimnasio: gymId }, { id_cliente: { in: clientIds } }] },
  })
  await prisma.clienteMembresia.deleteMany({ where: { cliente: { id_gimnasio: gymId } } })
  await prisma.cliente.deleteMany({ where: { id_gimnasio: gymId } })
  await prisma.membresia.deleteMany({ where: { id_gimnasio: gymId } })
  await prisma.gimnasio.delete({ where: { id_gimnasio: gymId } })
  await prisma.$disconnect()
})

async function createClient(label: string) {
  const suffix = `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const client = await prisma.cliente.create({
    data: {
      id_gimnasio: gymId,
      nombre: 'Cliente',
      apellido: label,
      cedula: suffix,
      correo: `${suffix}@test.invalid`,
    },
  })
  clientIds.push(client.id_cliente)
  return client
}

describe('invariantes de membresía en PostgreSQL real', () => {
  it('permite exactamente una creación activa bajo concurrencia', async () => {
    const client = await createClient('unique')
    const data = {
      id_cliente: client.id_cliente,
      id_membresia: planId,
      fecha_inicio: new Date('2026-08-01T00:00:00.000Z'),
      fecha_fin: new Date('2026-08-31T00:00:00.000Z'),
      estado: 'activo',
    }

    const results = await Promise.allSettled([
      prisma.clienteMembresia.create({ data }),
      prisma.clienteMembresia.create({ data }),
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(await prisma.clienteMembresia.count({
      where: { id_cliente: client.id_cliente, estado: 'activo' },
    })).toBe(1)
  })

  it('serializa renovaciones y conserva una sola fila activa', async () => {
    const client = await createClient('renew')
    const membership = await prisma.clienteMembresia.create({
      data: {
        id_cliente: client.id_cliente,
        id_membresia: planId,
        fecha_inicio: new Date('2026-08-01T00:00:00.000Z'),
        fecha_fin: new Date('2026-08-31T00:00:00.000Z'),
        estado: 'activo',
      },
    })

    const results = await Promise.all([
      service.renovar(membership.id_cliente_membresia, gymId),
      service.renovar(membership.id_cliente_membresia, gymId),
    ])
    const stored = await prisma.clienteMembresia.findMany({
      where: { id_cliente: client.id_cliente, estado: 'activo' },
    })

    expect(results.map((result) => result.id_cliente_membresia)).toEqual([
      membership.id_cliente_membresia,
      membership.id_cliente_membresia,
    ])
    expect(stored).toHaveLength(1)
    expect(stored[0].fecha_fin.toISOString().slice(0, 10)).toBe('2026-10-30')
  })
})
