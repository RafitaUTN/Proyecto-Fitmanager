import { z } from 'zod'

export const passwordSeguraSchema = z.string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial')

export const loginSchema = z.object({ correo: z.string().email(), password: z.string().min(1) })
export type LoginDto = z.infer<typeof loginSchema>

export const loginClienteSchema = z.object({ correo: z.string().email(), password: z.string().min(1) })
export type LoginClienteDto = z.infer<typeof loginClienteSchema>

export const setupPasswordSchema = z.object({ token: z.string().min(1), password: passwordSeguraSchema })

export const cambiarPasswordClienteSchema = z.object({
  password_actual: z.string().min(1),
  password_nueva: passwordSeguraSchema,
})

export const refreshSchema = z.object({ refreshToken: z.string().min(1) })
export type RefreshDto = z.infer<typeof refreshSchema>

export const solicitarRecuperacionSchema = z.object({ correo: z.string().email() })
export const restablecerPasswordSchema = z.object({ token: z.string().min(1), password: passwordSeguraSchema })
