/**
 * Controlador HTTP del módulo cliente-portal.controller.
 *
 * @remarks Recibe la petición Express, valida parámetros básicos y delega reglas de negocio a servicios especializados.
 */
import type { Request, Response, NextFunction } from 'express'
import { safeBigInt } from '../lib/bigint'
import { clienteAuthService } from '../services/cliente-auth.service'
import { cambiarPasswordClienteSchema } from '../dtos/auth.dto'
import { notificacionService } from '../services/notificacion.service'
import { listarNotificacionesQuery } from '../dtos/notificacion.dto'
import { clientePortalService } from '../services/cliente-portal.service'
import { programacionRutinaService } from '../services/programacion-rutina.service'
import { asistenciaService } from '../services/asistencia.service'

export const clientePortalController = {
  async perfil(req: Request, res: Response, next: NextFunction) {
    try {
      const idCliente = safeBigInt(req.usuario.id_usuario)
      const perfil = await clientePortalService.obtenerPerfil(idCliente)
      if (!perfil) {
        res.status(404).json({ error: 'Cliente no encontrado' })
        return
      }
      res.json(perfil)
    } catch (error) {
      next(error)
    }
  },

  async membresia(req: Request, res: Response, next: NextFunction) {
    try {
      const idCliente = safeBigInt(req.usuario.id_usuario)
      res.json(await clientePortalService.obtenerMembresia(idCliente))
    } catch (error) {
      next(error)
    }
  },

  async rutinas(req: Request, res: Response, next: NextFunction) {
    try {
      const idCliente = safeBigInt(req.usuario.id_usuario)
      res.json(await clientePortalService.obtenerRutinas(idCliente))
    } catch (error) {
      next(error)
    }
  },

  async calendarioRutinas(req: Request, res: Response, next: NextFunction) {
    try {
      const { desde, hasta } = req.query as { desde?: string; hasta?: string }
      if (!desde || !hasta) {
        res.status(400).json({ error: 'Rango de fechas requerido', codigo: 'VALIDATION_ERROR' })
        return
      }
      res.json(await programacionRutinaService.calendarioCliente(req.context, desde, hasta))
    } catch (error) {
      next(error)
    }
  },

  async completarRutinaProgramada(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de programación')
      res.json(await programacionRutinaService.completarCliente(req.context, id))
    } catch (error) {
      next(error)
    }
  },

  async asistenciaActual(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await asistenciaService.asistenciaActualCliente(req.context))
    } catch (error) {
      next(error)
    }
  },

  async registrarEntrada(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await asistenciaService.registrarEntradaCliente(req.context))
    } catch (error) {
      next(error)
    }
  },

  async registrarSalida(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await asistenciaService.registrarSalidaCliente(req.context))
    } catch (error) {
      next(error)
    }
  },

  async cambiarPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = cambiarPasswordClienteSchema.parse(req.body)
      const idCliente = safeBigInt(req.usuario.id_usuario)

      await clienteAuthService.cambiarPassword(idCliente, dto.contrasena_actual, dto.contrasena_nueva)
      res.json({ mensaje: 'Contraseña actualizada correctamente.' })
    } catch (error: any) {
      if (error.codigo) {
        res.status(error.statusCode || 400).json({ error: error.message, codigo: error.codigo })
        return
      }
      next(error)
    }
  },

  async notificaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const { tipo } = listarNotificacionesQuery.parse(req.query)
      res.json(await notificacionService.listarCliente(req.context.actorId, req.context.gymId, tipo))
    } catch (error) {
      next(error)
    }
  },

  async contarNotificaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const total = await notificacionService.contarNoLeidasCliente(req.context.actorId, req.context.gymId)
      res.json({ total })
    } catch (error) {
      next(error)
    }
  },

  async marcarNotificacionLeida(req: Request, res: Response, next: NextFunction) {
    try {
      const id = safeBigInt(req.params.id, 'id de notificación')
      await notificacionService.marcarLeidaCliente(id, req.context.actorId, req.context.gymId)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  },
}
