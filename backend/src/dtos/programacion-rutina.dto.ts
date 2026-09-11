/**
 * Esquemas de validación para programación de rutinas.
 *
 * @remarks Mantienen contratos de entrada pequeños y explícitos antes de
 * aplicar reglas de conflicto, tenant y RBAC en la capa de servicio.
 */
import { z } from 'zod'

export const nivelesCliente = ['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO', 'EXPERTO'] as const
export const nivelesSesionRutina = [...nivelesCliente, 'TODOS'] as const
export const estadosSesionRutina = ['PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'] as const

const dateTimeInput = z.string().datetime({ offset: true }).or(z.string().min(16))

const programacionRutinaBaseSchema = z
  .object({
    id_rutina: z.coerce.number().int().positive(),
    id_entrenador: z.coerce.number().int().positive(),
    fecha: z.string().min(10).max(10),
    hora_inicio: dateTimeInput,
    hora_fin: dateTimeInput,
    niveles: z.array(z.enum(nivelesSesionRutina)).default(['TODOS']),
    clientes: z.array(z.coerce.number().int().positive()).default([]),
    capacidad: z.coerce.number().int().positive().optional(),
    notas: z.string().trim().max(500).optional(),
  })
  .strict()

export const crearProgramacionRutinaSchema = programacionRutinaBaseSchema
  .refine((data) => new Date(data.hora_fin).getTime() > new Date(data.hora_inicio).getTime(), {
    message: 'La hora fin debe ser posterior a la hora inicio',
    path: ['hora_fin'],
  })

export const actualizarProgramacionRutinaSchema = programacionRutinaBaseSchema.partial().refine(
  (data) => {
    if (!data.hora_inicio || !data.hora_fin) return true
    return new Date(data.hora_fin).getTime() > new Date(data.hora_inicio).getTime()
  },
  {
    message: 'La hora fin debe ser posterior a la hora inicio',
    path: ['hora_fin'],
  },
)

export const listarProgramacionesRutinaSchema = z.object({
  desde: z.string().min(10).max(10),
  hasta: z.string().min(10).max(10),
  id_entrenador: z.coerce.number().int().positive().optional(),
  id_rutina: z.coerce.number().int().positive().optional(),
  nivel: z.enum(nivelesSesionRutina).optional(),
  estado: z.enum(estadosSesionRutina).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
})

export const cancelarProgramacionRutinaSchema = z
  .object({ motivo: z.string().trim().max(300).optional() })
  .strict()

export type CrearProgramacionRutinaDto = z.infer<typeof crearProgramacionRutinaSchema>
export type ActualizarProgramacionRutinaDto = z.infer<typeof actualizarProgramacionRutinaSchema>
export type ListarProgramacionesRutinaDto = z.infer<typeof listarProgramacionesRutinaSchema>
