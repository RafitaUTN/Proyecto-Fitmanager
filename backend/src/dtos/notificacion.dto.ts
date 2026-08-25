import { z } from 'zod'
import { paginacionSchema } from './paginacion.dto'

export const listarNotificacionesQuery = z.object({
  tipo: z.enum(['MEMBRESIA', 'TRANSFERENCIA', 'SISTEMA']).optional(),
}).merge(paginacionSchema)

export type ListarNotificacionesQuery = z.infer<typeof listarNotificacionesQuery>
