import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'
import { hashToken } from '../lib/token-hash'

type TipoConsumible = 'ACTIVACION' | 'RECUPERACION'
export type RecoveryActor = { actorType: 'CLIENTE'; actorId: bigint } | { actorType: 'STAFF'; actorId: bigint }
export type ActionToken = { id: bigint; value: string }
type TokenDb = Pick<typeof prisma, 'token'>

async function persistirToken(
  db: TokenDb,
  actor: RecoveryActor,
  tipo: TipoConsumible,
  ttlMs: number,
  creadoPor?: bigint,
): Promise<ActionToken> {
  const value = crypto.randomBytes(32).toString('hex')
  const filtroActor = actor.actorType === 'CLIENTE'
    ? { id_cliente: actor.actorId }
    : { id_usuario: actor.actorId }

  // Un actor conserva un único enlace vigente por propósito. Crear uno nuevo
  // invalida el anterior antes de que el valor en claro abandone este proceso.
  await db.token.deleteMany({ where: { ...filtroActor, tipo, usado_en: null } })
  const record = await db.token.create({
    data: {
      ...filtroActor,
      tipo,
      token_hash: hashToken(value),
      expira_en: new Date(Date.now() + ttlMs),
      creado_por: creadoPor ?? undefined,
    },
    select: { id: true },
  })
  return { id: record.id, value }
}

export const tokenService = {
  async crearActivacionRegistro(idCliente: bigint, creadoPor?: bigint, db?: TokenDb): Promise<ActionToken> {
    const actor: RecoveryActor = { actorType: 'CLIENTE', actorId: idCliente }
    if (db) return persistirToken(db, actor, 'ACTIVACION', 24 * 60 * 60 * 1000, creadoPor)
    return prisma.$transaction((tx) => persistirToken(tx, actor, 'ACTIVACION', 24 * 60 * 60 * 1000, creadoPor))
  },

  async crearActivacion(idCliente: bigint, creadoPor?: bigint): Promise<string> {
    return (await this.crearActivacionRegistro(idCliente, creadoPor)).value
  },

  async crearRecuperacionRegistro(actor: RecoveryActor, db?: TokenDb): Promise<ActionToken> {
    if (db) return persistirToken(db, actor, 'RECUPERACION', 60 * 60 * 1000)
    return prisma.$transaction((tx) => persistirToken(tx, actor, 'RECUPERACION', 60 * 60 * 1000))
  },

  async crearRecuperacion(actor: RecoveryActor): Promise<string> {
    return (await this.crearRecuperacionRegistro(actor)).value
  },

  async validarToken(token: string, tipo: TipoConsumible): Promise<{ id_cliente: bigint | null; id_usuario: bigint | null }> {
    const tokenHash = hashToken(token)
    const record = await prisma.token.findUnique({ where: { token_hash: tokenHash } })

    if (!record) {
      throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
    }
    if (record.tipo !== tipo) {
      throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
    }
    if (record.usado_en) {
      throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
    }
    if (record.expira_en < new Date()) {
      throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
    }

    return { id_cliente: record.id_cliente, id_usuario: record.id_usuario }
  },

  async usarToken(token: string, tipo: TipoConsumible): Promise<{ id_cliente: bigint | null; id_usuario: bigint | null }> {
    const tokenHash = hashToken(token)
    const consumido = await prisma.token.updateMany({
      where: { token_hash: tokenHash, tipo, usado_en: null, expira_en: { gt: new Date() } },
      data: { usado_en: new Date() },
    })
    if (consumido.count !== 1) throw new AppError('Enlace inválido o expirado', 400, 'TOKEN_INVALIDO')
    const record = await prisma.token.findUnique({ where: { token_hash: tokenHash } })
    return { id_cliente: record!.id_cliente, id_usuario: record!.id_usuario }
  },
}
