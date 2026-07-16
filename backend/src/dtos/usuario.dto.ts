import { z } from 'zod'

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  correo: z.string().email().max(150),
  password: z.string().min(6).max(100),
  rol: z.enum(['Administrador', 'Recepcionista', 'Entrenador']),
})

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellido: z.string().min(1).max(100).optional(),
  correo: z.string().email().max(150).optional(),
  password: z.string().min(6).max(100).optional(),
  rol: z.enum(['Administrador', 'Recepcionista', 'Entrenador']).optional(),
  estado: z.boolean().optional(),
})

export type CrearUsuarioDto = z.infer<typeof crearUsuarioSchema>
export type ActualizarUsuarioDto = z.infer<typeof actualizarUsuarioSchema>
