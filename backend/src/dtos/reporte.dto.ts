import { z } from 'zod'

export const reporteQuerySchema = z.object({
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type ReporteQueryDto = z.infer<typeof reporteQuerySchema>
