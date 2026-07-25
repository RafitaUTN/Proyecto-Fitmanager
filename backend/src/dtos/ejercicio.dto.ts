import { z } from 'zod'

export const niveles = ['principiante', 'intermedio', 'avanzado'] as const

export const categorias = [
  'Pecho', 'Espalda', 'Pierna', 'Bíceps', 'Tríceps',
  'Hombro', 'Abdomen', 'Cardio', 'Funcional', 'Movilidad',
] as const

export const crearEjercicioSchema = z.object({
  nombre: z.string().min(1).max(100),
  grupo_muscular: z.string().min(1).max(50),
  descripcion: z.string().optional(),
  nivel: z.enum(niveles).optional().default('principiante'),
  categoria: z.string().optional(),
})

export const actualizarEjercicioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  grupo_muscular: z.string().min(1).max(50).optional(),
  descripcion: z.string().optional(),
  nivel: z.enum(niveles).optional(),
  categoria: z.string().optional(),
  estado: z.boolean().optional(),
})

export type CrearEjercicioDto = z.infer<typeof crearEjercicioSchema>
export type ActualizarEjercicioDto = z.infer<typeof actualizarEjercicioSchema>
