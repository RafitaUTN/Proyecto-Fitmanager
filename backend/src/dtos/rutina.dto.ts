import { z } from 'zod'

export const ejercicioEnRutinaSchema = z.object({
  id_ejercicio: z.coerce.number().int().positive(),
  series: z.coerce.number().int().positive(),
  repeticiones: z.coerce.number().int().positive(),
  peso_sugerido: z.coerce.number().positive().optional(),
})

export const crearRutinaSchema = z.object({
  nombre: z.string().min(1).max(100),
  descripcion: z.string().optional(),
  ejercicios: z.array(ejercicioEnRutinaSchema).min(1, 'Debe incluir al menos un ejercicio'),
})

export const actualizarRutinaSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  descripcion: z.string().optional(),
  ejercicios: z.array(ejercicioEnRutinaSchema).min(1).optional(),
  estado: z.boolean().optional(),
})

export const asignarRutinaSchema = z.object({
  id_cliente: z.coerce.number().int().positive(),
  fecha_asignacion: z.string().optional(),
})

export const asignarEntrenadorSchema = z.object({
  id_entrenador: z.coerce.number().int().positive(),
})

export type CrearRutinaDto = z.infer<typeof crearRutinaSchema>
export type ActualizarRutinaDto = z.infer<typeof actualizarRutinaSchema>
export type AsignarRutinaDto = z.infer<typeof asignarRutinaSchema>
export type AsignarEntrenadorDto = z.infer<typeof asignarEntrenadorSchema>
