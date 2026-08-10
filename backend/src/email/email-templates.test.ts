import { describe, expect, it } from 'vitest'
import { buildEmailActionUrl } from './email-links'
import { activationEmail } from './templates/activation'
import { passwordResetEmail } from './templates/password-reset'

describe('enlaces y plantillas de correo', () => {
  it('construye el enlace localhost sin dividir ni alterar el token', () => {
    const url = buildEmailActionUrl('http://localhost:5173/', 'setup-password', 'abc+/= 123')
    expect(url).toBe('http://localhost:5173/setup-password?token=abc%2B%2F%3D+123')
    expect(new URL(url).searchParams.get('token')).toBe('abc+/= 123')
  })

  it('construye el enlace de producción desde FRONTEND_URL', () => {
    expect(buildEmailActionUrl('https://fitmanager-saas.vercel.app', 'reset-password', 'token-seguro'))
      .toBe('https://fitmanager-saas.vercel.app/reset-password?token=token-seguro')
  })

  it('incluye cliente, gimnasio y fallback de texto sin mensajes de desarrollo', () => {
    const contenido = activationEmail({
      nombre: 'Ana <Admin>',
      gimnasio: 'Gym & Salud',
      enlace: 'https://fitmanager.test/setup-password?token=uno',
      frontendUrl: 'https://fitmanager.test',
    })
    expect(contenido.html).toContain('Ana &lt;Admin&gt;')
    expect(contenido.html).toContain('Gym &amp; Salud')
    expect(contenido.text).toContain('Ana <Admin>')
    expect(contenido.text).toContain('Gym & Salud')
    expect(`${contenido.html} ${contenido.text}`).not.toMatch(/localhost|desarrollo|temporal|beta/i)
  })

  it('incluye recuperación, expiración y versión de texto plano', () => {
    const contenido = passwordResetEmail({ nombre: 'Luis', enlace: 'https://fitmanager.test/reset-password?token=dos' })
    expect(contenido.html).toContain('Restablece tu contraseña')
    expect(contenido.html).toContain('60 minutos')
    expect(contenido.text).toContain('token=dos')
  })
})
