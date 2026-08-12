import { z } from 'zod'

export const passwordSeguraSchema = z.string()
  .max(100, 'La contraseña no puede superar 100 caracteres')
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial')

export const loginSchema = z.object({ correo: z.string().trim().toLowerCase().email(), password: z.string().min(1) })
export type LoginDto = z.infer<typeof loginSchema>

export const setupPasswordSchema = z.object({ token: z.string().min(1), password: passwordSeguraSchema })

export const cambiarPasswordSchema = z.object({
  contrasena_actual: z.string().min(1),
  contrasena_nueva: passwordSeguraSchema,
  confirmar_password: z.string().min(1),
}).strict().refine((data) => data.contrasena_nueva === data.confirmar_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar_password'],
})

export const cambiarPasswordClienteSchema = cambiarPasswordSchema

export const solicitarRecuperacionSchema = z.object({ correo: z.string().trim().toLowerCase().email() })
export const restablecerPasswordSchema = z.object({ token: z.string().min(1), password: passwordSeguraSchema })
