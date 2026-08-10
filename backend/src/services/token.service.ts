import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'
import { hashToken } from '../lib/token-hash'

type TipoConsumible = 'ACTIVACION' | 'RECUPERACION'
type RecoveryActor = { actorType: 'CLIENTE'; actorId: bigint } | { actorType: 'STAFF'; actorId: bigint }

export const tokenService = {
  async crearActivacion(idCliente: bigint, creadoPor?: bigint): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(token)
    await prisma.token.create({
      data: {
        id_cliente: idCliente,
        tipo: 'ACTIVACION',
        token_hash: tokenHash,
        expira_en: new Date(Date.now() + 24 * 60 * 60 * 1000),
        creado_por: creadoPor ?? undefined,
      },
    })
    return token
  },

  async crearRecuperacion(actor: RecoveryActor): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    const filtroActor = actor.actorType === 'CLIENTE'
      ? { id_cliente: actor.actorId }
      : { id_usuario: actor.actorId }
    await prisma.$transaction(async (tx) => {
      await tx.token.deleteMany({ where: { ...filtroActor, tipo: 'RECUPERACION', usado_en: null } })
      await tx.token.create({
        data: {
          ...filtroActor,
          tipo: 'RECUPERACION',
          token_hash: hashToken(token),
          expira_en: new Date(Date.now() + 60 * 60 * 1000),
        },
      })
    })
    return token
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
    const actor = await this.validarToken(token, tipo)

    const tokenHash = hashToken(token)
    await prisma.token.update({
      where: { token_hash: tokenHash },
      data: { usado_en: new Date() },
    })

    return actor
  },
}
