/**
 * Tipos compartidos express.d para la API.
 *
 * @remarks Extiende contratos TypeScript usados por Express, serialización o contexto autenticado.
 */
import type { TokenPayload } from '../lib/jwt'
import type { RequestContext } from './request-context'

declare global {
  namespace Express {
    interface Request {
      usuario: TokenPayload
      context: RequestContext
    }
  }
}
