import type { Request, Response, NextFunction } from 'express'

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = req.context
    if (!context || !roles.includes(context.role)) {
      res.status(403).json({ error: 'No autorizado para esta acción' })
      return
    }
    next()
  }
}
