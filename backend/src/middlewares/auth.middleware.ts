import type { Request, Response, NextFunction } from 'express'
import { verificarToken } from '../lib/jwt'
import { prisma } from '../lib/prisma'
import type { RequestContext, StaffRole } from '../types/request-context'

const STAFF_ROLES = new Set<StaffRole>(['Administrador', 'Recepcionista', 'Entrenador'])

/**
 * Verifica la firma JWT y vuelve a validar el actor y el gimnasio en DB.
 * Esto centraliza el contexto tenant y revoca de inmediato a actores inactivos.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }

  let payload
  try {
    payload = verificarToken(header.slice(7))
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
    return
  }

  try {
    const actorId = BigInt(payload.id_usuario)
    const gymId = BigInt(payload.id_gimnasio)
    let context: RequestContext | null = null

    if (payload.rol === 'Cliente') {
      const cliente = await prisma.cliente.findFirst({
        where: {
          id_cliente: actorId,
          id_gimnasio: gymId,
          estado: true,
          gimnasio: { estado: true },
        },
        select: { id_cliente: true },
      })
      if (cliente) context = { actorId, gymId, actorType: 'CLIENTE', role: 'Cliente' }
    } else if (STAFF_ROLES.has(payload.rol as StaffRole)) {
      const usuario = await prisma.usuario.findFirst({
        where: {
          id_usuario: actorId,
          id_gimnasio: gymId,
          estado: true,
          gimnasio: { estado: true },
        },
        select: { id_usuario: true },
      })
      if (usuario) {
        context = { actorId, gymId, actorType: 'STAFF', role: payload.rol as StaffRole }
      }
    }

    if (!context) {
      res.status(401).json({ error: 'Sesión revocada o actor inactivo' })
      return
    }

    req.usuario = payload
    req.context = context
    next()
  } catch (error) {
    next(error)
  }
}
