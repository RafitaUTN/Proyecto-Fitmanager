import type { Request, Response, NextFunction } from 'express'
import { registrarGimnasioSchema } from '../dtos/gimnasio.dto'
import { gimnasioService } from '../services/gimnasio.service'

export const gimnasioController = {
  async registrar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = registrarGimnasioSchema.parse(req.body)
      const resultado = await gimnasioService.registrar(dto)
      res.status(201).json({
        id_gimnasio: resultado.gimnasio.id_gimnasio,
        id_usuario: resultado.usuario.id_usuario,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Datos inválidos', detalles: error.errors })
        return
      }
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }
      next(error)
    }
  },
}
