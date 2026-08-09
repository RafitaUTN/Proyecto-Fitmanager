import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../config/env'

export interface TokenPayload {
  id_usuario: number
  id_gimnasio: number
  rol: string
  typ?: 'access' | 'refresh'
}

const JWT_ISSUER = 'fitmanager-api'
const JWT_AUDIENCE = 'fitmanager-web'

export function firmarToken(payload: TokenPayload) {
  return jwt.sign({ ...payload, typ: 'access' }, env.jwtSecret, {
    expiresIn: '15m', issuer: JWT_ISSUER, audience: JWT_AUDIENCE, jwtid: crypto.randomUUID(),
  })
}

export function firmarRefreshToken(payload: TokenPayload) {
  return jwt.sign({ ...payload, typ: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: '7d', issuer: JWT_ISSUER, audience: JWT_AUDIENCE, jwtid: crypto.randomUUID(),
  })
}

export function verificarToken(token: string) {
  const payload = jwt.verify(token, env.jwtSecret, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE }) as TokenPayload
  if (payload.typ !== 'access') throw new Error('Tipo de token inválido')
  return payload
}

export function verificarRefreshToken(token: string) {
  const payload = jwt.verify(token, env.jwtRefreshSecret, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE }) as TokenPayload
  if (payload.typ !== 'refresh') throw new Error('Tipo de token inválido')
  return payload
}
