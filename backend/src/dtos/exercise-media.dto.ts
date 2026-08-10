import { z } from 'zod'

export const buscarMediaEjercicioSchema = z.object({
  buscar: z.string().trim().min(1, 'Escribe un término de búsqueda').max(100),
  limite: z.coerce.number().int().min(1).max(20).default(8),
})
