import { z } from 'zod'

export const PASSWORD_REQUIREMENTS = [
  { label: '12 caracteres mínimo', test: (value: string) => value.length >= 12 },
  { label: 'Una letra mayúscula', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'Una letra minúscula', test: (value: string) => /[a-z]/.test(value) },
  { label: 'Un número', test: (value: string) => /[0-9]/.test(value) },
  { label: 'Un carácter especial', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const

export const strongPasswordSchema = z.string()
  .max(100, 'La contraseña no puede superar 100 caracteres')
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .regex(/[A-Z]/, 'Incluye al menos una mayúscula')
  .regex(/[a-z]/, 'Incluye al menos una minúscula')
  .regex(/[0-9]/, 'Incluye al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Incluye al menos un carácter especial')

export function isStrongPassword(value: string): boolean {
  return strongPasswordSchema.safeParse(value).success
}
