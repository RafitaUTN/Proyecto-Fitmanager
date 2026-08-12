import { describe, expect, it } from 'vitest'
import { isStrongPassword, strongPasswordSchema } from './password-policy'

describe('política de contraseña del frontend', () => {
  it.each(['123456', 'solominusculas#1', 'SOLOMAYUSCULAS#1', 'SinNumero#Clave', 'SinEspecial1234'])(
    'bloquea %s antes de enviar el formulario',
    (password) => {
      expect(isStrongPassword(password)).toBe(false)
      expect(strongPasswordSchema.safeParse(password).success).toBe(false)
    },
  )

  it('acepta el mismo caso fuerte del backend', () => {
    expect(isStrongPassword('ClaveSegura#2026')).toBe(true)
    expect(strongPasswordSchema.safeParse('ClaveSegura#2026').success).toBe(true)
  })
})
