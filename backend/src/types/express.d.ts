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
