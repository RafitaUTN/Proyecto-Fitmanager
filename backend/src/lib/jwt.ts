import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export interface TokenPayload {
  id_usuario: number
  id_gimnasio: number
  rol: string
}

export function firmarToken(payload: TokenPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '8h' })
}

export function firmarRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: '7d' })
}

export function verificarToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as TokenPayload
}

export function verificarRefreshToken(token: string) {
  return jwt.verify(token, env.jwtRefreshSecret) as TokenPayload
}
