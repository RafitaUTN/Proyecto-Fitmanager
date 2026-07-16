import type { Request, Response, NextFunction } from 'express'
import { registrarGimnasioSchema } from '../dtos/gimnasio.dto'
import { gimnasioService } from '../services/gimnasio.service'
import { firmarToken } from '../lib/jwt'

export const gimnasioController = {
  async registrar(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = registrarGimnasioSchema.parse(req.body)
      const resultado = await gimnasioService.registrar(dto)
      const usuario = resultado.usuario
      const token = firmarToken({ id_usuario: Number(usuario.id_usuario), id_gimnasio: Number(usuario.id_gimnasio), rol: usuario.rol })
      res.status(201).json({
        id_gimnasio: resultado.gimnasio.id_gimnasio,
        id_usuario: resultado.usuario.id_usuario,
        token,
        usuario: { id_usuario: Number(usuario.id_usuario), nombre: usuario.nombre, apellido: usuario.apellido, correo: usuario.correo, rol: usuario.rol },
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
