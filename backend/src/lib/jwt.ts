import jwt from 'jsonwebtoken'
import { env } from '../config/env'

interface TokenPayload {
  id_usuario: number
  id_gimnasio: number
  rol: string
}

export function firmarToken(payload: TokenPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '8h' })
}

export function verificarToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as TokenPayload
}
