import { z } from 'zod'

export const crearMembresiaSchema = z.object({
  nombre: z.string().min(1).max(100),
  descripcion: z.string().optional(),
  precio: z.number().positive().max(9999999.99),
  duracion_dias: z.number().int().positive(),
})

export const actualizarMembresiaSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  descripcion: z.string().optional(),
  precio: z.number().positive().max(9999999.99).optional(),
  duracion_dias: z.number().int().positive().optional(),
  estado: z.boolean().optional(),
})

export type CrearMembresiaDto = z.infer<typeof crearMembresiaSchema>
export type ActualizarMembresiaDto = z.infer<typeof actualizarMembresiaSchema>
