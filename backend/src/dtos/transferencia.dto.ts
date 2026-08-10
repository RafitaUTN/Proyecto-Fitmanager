import { z } from 'zod'

export const crearSolicitudSchema = z.object({
  id_cliente: z.coerce.number().int().positive(),
  motivo: z.string().max(300).optional(),
})

export const responderSolicitudSchema = z.object({
  observaciones: z.string().min(1, 'Las observaciones son obligatorias'),
})

export const listarSolicitudesQuery = z.object({
  estado: z.enum(['PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA']).optional(),
  rol: z.enum(['origen', 'destino']).optional(),
})

export const buscarClienteQuery = z.object({
  cedula: z.string().min(1).max(20),
})

export type CrearSolicitudDto = z.infer<typeof crearSolicitudSchema>
export type ResponderSolicitudDto = z.infer<typeof responderSolicitudSchema>
