import { z } from 'zod'

export const asignarMembresiaSchema = z.object({
  id_cliente: z.coerce.number().int().positive(),
  id_membresia: z.coerce.number().int().positive(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  id_entrenador: z.coerce.number().int().positive().optional(),
})

export type AsignarMembresiaDto = z.infer<typeof asignarMembresiaSchema>

export const cambiarPlanSchema = z.object({
  id_cliente: z.coerce.number().int().positive(),
  id_membresia: z.coerce.number().int().positive(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),
})

export type CambiarPlanDto = z.infer<typeof cambiarPlanSchema>
