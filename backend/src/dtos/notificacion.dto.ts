/**
 * Esquemas de validación del módulo notificacion.dto.
 *
 * @remarks Centraliza reglas Zod para rechazar entradas inválidas antes de llegar a la lógica de negocio.
 */
import { z } from 'zod'

export const listarNotificacionesQuery = z.object({
  tipo: z.enum(['MEMBRESIA', 'TRANSFERENCIA', 'SISTEMA']).optional(),
})

export type ListarNotificacionesQuery = z.infer<typeof listarNotificacionesQuery>
