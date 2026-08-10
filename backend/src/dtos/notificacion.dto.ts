import { z } from 'zod'

export const listarNotificacionesQuery = z.object({
  tipo: z.enum(['MEMBRESIA', 'TRANSFERENCIA', 'SISTEMA']).optional(),
})

export type ListarNotificacionesQuery = z.infer<typeof listarNotificacionesQuery>
