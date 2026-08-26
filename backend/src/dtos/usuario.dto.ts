/**
 * Esquemas de validación del módulo usuario.dto.
 *
 * @remarks Centraliza reglas Zod para rechazar entradas inválidas antes de llegar a la lógica de negocio.
 */
import { z } from 'zod'
import { passwordSeguraSchema, cambiarPasswordSchema } from './auth.dto'

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  correo: z.string().email().max(150),
  password: passwordSeguraSchema,
  rol: z.enum(['Administrador', 'Recepcionista', 'Entrenador']),
})

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellido: z.string().min(1).max(100).optional(),
  correo: z.string().email().max(150).optional(),
  password: passwordSeguraSchema.optional(),
  rol: z.enum(['Administrador', 'Recepcionista', 'Entrenador']).optional(),
  estado: z.boolean().optional(),
})

export const cambiarPasswordUsuarioSchema = cambiarPasswordSchema

export type CrearUsuarioDto = z.infer<typeof crearUsuarioSchema>
export type ActualizarUsuarioDto = z.infer<typeof actualizarUsuarioSchema>
export type CambiarPasswordUsuarioDto = z.infer<typeof cambiarPasswordUsuarioSchema>
