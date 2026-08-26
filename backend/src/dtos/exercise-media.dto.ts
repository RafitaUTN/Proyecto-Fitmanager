/**
 * Esquemas de validación del módulo exercise-media.dto.
 *
 * @remarks Centraliza reglas Zod para rechazar entradas inválidas antes de llegar a la lógica de negocio.
 */
import { z } from 'zod'

export const buscarMediaEjercicioSchema = z.object({
  buscar: z.string().trim().min(1, 'Escribe un término de búsqueda').max(100),
  limite: z.coerce.number().int().min(1).max(20).default(8),
})
