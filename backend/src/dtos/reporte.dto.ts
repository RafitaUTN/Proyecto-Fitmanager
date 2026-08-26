/**
 * Esquemas de validación del módulo reporte.dto.
 *
 * @remarks Centraliza reglas Zod para rechazar entradas inválidas antes de llegar a la lógica de negocio.
 */
import { z } from 'zod'

export const reporteQuerySchema = z.object({
  fecha_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  fecha_fin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export type ReporteQueryDto = z.infer<typeof reporteQuerySchema>
