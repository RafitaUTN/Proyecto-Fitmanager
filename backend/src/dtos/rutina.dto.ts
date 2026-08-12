import { z } from 'zod'

export const ejercicioEnRutinaSchema = z.object({
  id_ejercicio: z.coerce.number().int().positive(),
  series: z.coerce.number().int().positive(),
  repeticiones: z.coerce.number().int().positive(),
  peso_sugerido: z.coerce.number().positive().optional(),
  descanso: z.coerce.number().int().min(0).max(3600).optional(),
  notas: z.string().max(1000).optional(),
  orden: z.coerce.number().int().min(0).optional(),
})

export const crearRutinaSchema = z.object({
  nombre: z.string().min(1).max(100),
  descripcion: z.string().optional(),
  objetivo: z.string().max(500).optional(),
  duracion_minutos: z.coerce.number().int().positive().max(600).optional(),
  dificultad: z.enum(['principiante', 'intermedio', 'avanzado']).optional(),
  ejercicios: z.array(ejercicioEnRutinaSchema).min(1, 'Debe incluir al menos un ejercicio'),
})

export const actualizarRutinaSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  descripcion: z.string().optional(),
  objetivo: z.string().max(500).optional(),
  duracion_minutos: z.coerce.number().int().positive().max(600).optional(),
  dificultad: z.enum(['principiante', 'intermedio', 'avanzado']).optional(),
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

export const actualizarEjercicioClienteSchema = z.object({
  series: z.coerce.number().int().positive().optional(),
  repeticiones: z.coerce.number().int().positive().optional(),
  peso: z.coerce.number().nonnegative().optional(),
  descanso: z.coerce.number().int().nonnegative().optional(),
  observaciones: z.string().max(1000).optional(),
  estado: z.boolean().optional(),
}).strict()

export const actualizarClienteRutinaSchema = z.object({
  fecha_inicio: z.iso.date().optional(),
  fecha_fin: z.iso.date().optional(),
  observaciones: z.string().max(2000).optional(),
  estado: z.enum(['activa', 'completada', 'cancelada', 'archivada']).optional(),
}).strict().refine(
  (data) => !data.fecha_inicio || !data.fecha_fin || data.fecha_inicio <= data.fecha_fin,
  { message: 'La fecha de inicio no puede ser posterior a la fecha final' },
)

export type CrearRutinaDto = z.infer<typeof crearRutinaSchema>
export type ActualizarRutinaDto = z.infer<typeof actualizarRutinaSchema>
export type AsignarRutinaDto = z.infer<typeof asignarRutinaSchema>
export type AsignarEntrenadorDto = z.infer<typeof asignarEntrenadorSchema>
