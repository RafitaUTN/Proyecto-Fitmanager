import type { Request, Response, NextFunction } from 'express'
import { verificarToken } from '../lib/jwt'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }
  try {
    const payload = verificarToken(header.slice(7))
    req.usuario = payload
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
