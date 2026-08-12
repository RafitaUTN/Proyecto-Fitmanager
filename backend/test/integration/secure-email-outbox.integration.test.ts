import bcrypt from 'bcrypt'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let prisma: any
let emailService: any
let gymId: bigint
let clienteId: bigint
let outboxId: bigint

function requireIsolatedDatabase() {
  const raw = process.env.TEST_DATABASE_URL
  if (!raw) throw new Error('TEST_DATABASE_URL es obligatoria para integration tests')
  const url = new URL(raw)
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(url.hostname)) {
    throw new Error(`Integration tests bloqueados fuera de localhost: ${url.hostname}`)
  }
  process.env.DATABASE_URL = raw
  process.env.EMAIL_DELIVERY_ENABLED = 'false'
}

beforeAll(async () => {
  requireIsolatedDatabase()
  ;({ prisma } = await import('../../src/lib/prisma'))
  ;({ emailService } = await import('../../src/email/email.service'))
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const gimnasio = await prisma.gimnasio.create({ data: { nombre: 'Secure outbox', correo: `gym-outbox-${suffix}@test.invalid` } })
  gymId = gimnasio.id_gimnasio
  const cliente = await prisma.cliente.create({
    data: {
      id_gimnasio: gymId,
      nombre: 'Cliente',
      apellido: 'Seguro',
      cedula: `outbox-${suffix}`,
      correo: `client-outbox-${suffix}@test.invalid`,
      contrasena: await bcrypt.hash('ClaveSegura#2026', 4),
    },
  })
  clienteId = cliente.id_cliente
})

afterAll(async () => {
  if (!prisma || !gymId) return
  if (outboxId) await prisma.emailOutbox.deleteMany({ where: { id: outboxId } })
  await prisma.token.deleteMany({ where: { id_cliente: clienteId } })
  await prisma.cliente.delete({ where: { id_cliente: clienteId } })
  await prisma.gimnasio.delete({ where: { id_gimnasio: gymId } })
  await prisma.$disconnect()
})

describe('outbox de correo sin secretos persistidos', () => {
  it('persiste solo plantilla, contexto no sensible y hash del token', async () => {
    await emailService.sendPasswordResetEmail(
      { nombre: 'Cliente', correo: 'client-outbox@test.invalid' },
      { actorType: 'CLIENTE', actorId: clienteId },
    )
    const evento = await prisma.emailOutbox.findFirst({
      where: { id_token: { not: null }, token: { id_cliente: clienteId } },
      orderBy: { creado_en: 'desc' },
      include: { token: true },
    })
    expect(evento).toBeTruthy()
    outboxId = evento.id
    expect(evento.html).toBe('')
    expect(evento.texto).toBe('')
    expect(evento.template_id).toBe('PASSWORD_RECOVERY_V1')
    expect(evento.contexto).toEqual({ nombre: 'Cliente' })
    expect(evento.estado).toBe('FALLIDO')
    expect(evento.ultimo_error).toBe('PROVEEDOR_NO_CONFIGURADO')
    expect(evento.token.token_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(evento.contexto)).not.toMatch(/[a-f0-9]{64}/i)
  })

  it('no regenera ni expone tokens mientras el proveedor sigue deshabilitado', async () => {
    await prisma.emailOutbox.update({ where: { id: outboxId }, data: { proximo_reintento: new Date(0) } })
    const antes = await prisma.emailOutbox.findUnique({ where: { id: outboxId }, select: { id_token: true } })
    const result = await emailService.reenviarPendientes()
    const despues = await prisma.emailOutbox.findUnique({ where: { id: outboxId } })
    expect(result.omitidos).toBeGreaterThanOrEqual(1)
    expect(despues.id_token).toBe(antes.id_token)
    expect(despues.html).toBe('')
    expect(despues.texto).toBe('')
  })
})
