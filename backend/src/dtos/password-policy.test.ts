import { describe, expect, it } from 'vitest'
import { passwordSeguraSchema } from './auth.dto'
import { registrarGimnasioSchema } from './gimnasio.dto'
import { actualizarUsuarioSchema, crearUsuarioSchema } from './usuario.dto'

const segura = 'ClaveSegura#2026'

describe('política unificada de contraseñas', () => {
  it.each(['123456', 'solominusculas#1', 'SOLOMAYUSCULAS#1', 'SinNumeros#Clave', 'SinEspecial1234'])(
    'rechaza la contraseña débil %s en el contrato central',
    (password) => expect(passwordSeguraSchema.safeParse(password).success).toBe(false),
  )

  it('acepta una contraseña fuerte y limita su longitud', () => {
    expect(passwordSeguraSchema.safeParse(segura).success).toBe(true)
    expect(passwordSeguraSchema.safeParse(`A1#${'a'.repeat(98)}`).success).toBe(false)
  })

  it('aplica la política al registro del gimnasio', () => {
    const base = {
      nombre: 'Gym seguro',
      correo: 'gym@test.invalid',
      usuario: { nombre: 'Ada', apellido: 'Lovelace', correo: 'ada@test.invalid', password: '123456' },
    }
    const result = registrarGimnasioSchema.safeParse(base)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['usuario', 'password'])
    expect(registrarGimnasioSchema.safeParse({ ...base, usuario: { ...base.usuario, password: segura } }).success).toBe(true)
  })

  it('aplica la política al alta y cambio de contraseña del personal', () => {
    const base = { nombre: 'Grace', apellido: 'Hopper', correo: 'grace@test.invalid', rol: 'Entrenador' as const }
    expect(crearUsuarioSchema.safeParse({ ...base, password: '123456' }).success).toBe(false)
    expect(crearUsuarioSchema.safeParse({ ...base, password: segura }).success).toBe(true)
    expect(actualizarUsuarioSchema.safeParse({ password: '123456' }).success).toBe(false)
    expect(actualizarUsuarioSchema.safeParse({ password: segura }).success).toBe(true)
    expect(actualizarUsuarioSchema.safeParse({ nombre: 'Grace' }).success).toBe(true)
  })
})
