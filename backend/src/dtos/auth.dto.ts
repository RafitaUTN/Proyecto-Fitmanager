import { z } from 'zod'

export const loginSchema = z.object({
  correo: z.string().email(),
  password: z.string().min(1),
})

export type LoginDto = z.infer<typeof loginSchema>

export const loginClienteSchema = z.object({
  correo: z.string().email(),
  password: z.string().min(1),
})

export type LoginClienteDto = z.infer<typeof loginClienteSchema>

export const cambiarPasswordClienteSchema = z.object({
  password_actual: z.string().min(1),
  password_nueva: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export type RefreshDto = z.infer<typeof refreshSchema>
