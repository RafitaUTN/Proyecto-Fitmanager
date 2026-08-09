import { describe, expect, it, vi } from 'vitest'
import { decodificarToken, tokenExpirado, tokenValido } from './jwt'

function token(payload: object) {
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${body}.signature`
}

describe('JWT frontend', () => {
  it('acepta un access token no expirado', () => {
    vi.setSystemTime(new Date('2026-08-09T00:00:00Z'))
    const value = token({ id_usuario: 1, id_gimnasio: 2, rol: 'Administrador', exp: 1786234500, iat: 1 })
    expect(tokenValido(value)).toBe(true)
    expect(decodificarToken(value)?.id_gimnasio).toBe(2)
  })

  it('rechaza tokens expirados o malformados', () => {
    vi.setSystemTime(new Date('2026-08-09T00:00:00Z'))
    expect(tokenExpirado(token({ exp: 1 }))).toBe(true)
    expect(tokenValido('not-a-jwt')).toBe(false)
    expect(decodificarToken(token({ rol: 'Cliente' }))).toBeNull()
  })
})
