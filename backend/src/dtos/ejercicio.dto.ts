import { z } from 'zod'

export const niveles = ['principiante', 'intermedio', 'avanzado'] as const

export const categorias = [
  'Pecho', 'Espalda', 'Pierna', 'Bíceps', 'Tríceps',
  'Hombro', 'Abdomen', 'Cardio', 'Funcional', 'Movilidad',
] as const

const mediaUrl = z.string().trim().max(500).refine((value) => value.startsWith('/') || /^https:\/\//i.test(value), 'La URL debe usar HTTPS o ser una ruta local')

const camposVisuales = {
  imagen_url: mediaUrl.optional(),
  animacion_url: mediaUrl.optional(),
  tipo_media: z.enum(['imagen', 'animacion']).optional(),
  instrucciones: z.string().max(4000).optional(),
  equipo: z.string().max(100).optional(),
  musculos_secundarios: z.array(z.string().min(1).max(50)).max(10).optional(),
}

export const crearEjercicioSchema = z.object({
  nombre: z.string().min(1).max(100),
  grupo_muscular: z.string().min(1).max(50),
  descripcion: z.string().optional(),
  nivel: z.enum(niveles).optional().default('principiante'),
  categoria: z.string().optional(),
  ...camposVisuales,
})

export const actualizarEjercicioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  grupo_muscular: z.string().min(1).max(50).optional(),
  descripcion: z.string().optional(),
  nivel: z.enum(niveles).optional(),
  categoria: z.string().optional(),
  estado: z.boolean().optional(),
  ...camposVisuales,
})

export const catalogoEjerciciosSchema = z.object({
  buscar: z.string().trim().max(100).optional(),
  grupo_muscular: z.string().trim().max(50).optional(),
  categoria: z.string().trim().max(50).optional(),
  nivel: z.enum(niveles).optional(),
  estado: z.enum(['activo', 'inactivo', 'todos']).default('activo'),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(48).default(12),
})

export type CrearEjercicioDto = z.infer<typeof crearEjercicioSchema>
export type ActualizarEjercicioDto = z.infer<typeof actualizarEjercicioSchema>
export type CatalogoEjerciciosDto = z.infer<typeof catalogoEjerciciosSchema>
