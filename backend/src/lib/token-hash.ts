/**
 * Utilidad compartida token-hash para la API de FitManager.
 *
 * @remarks Evita duplicar lógica transversal usada por controladores, servicios o middlewares.
 */
import crypto from 'crypto'

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
