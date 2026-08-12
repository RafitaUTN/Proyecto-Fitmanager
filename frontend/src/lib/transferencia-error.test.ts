import { describe, expect, it } from 'vitest'
import { tryParseClienteActivoError } from './transferencia-error'

describe('tryParseClienteActivoError', () => {
  const data = {
    cliente: { id_cliente: 5, nombre: 'Ana', apellido: 'Lopez', cedula: '111' },
    gimnasio: { nombre: 'Otro Gym' },
    estado: 'Activo',
  }

  it('extrae data de un 409 CLIENTE_ACTIVO_OTRO_GYM', () => {
    const err = { status: 409, body: { error: 'El cliente ya se encuentra activo en otro gimnasio', codigo: 'CLIENTE_ACTIVO_OTRO_GYM', data } }
    expect(tryParseClienteActivoError(err)).toEqual(data)
  })

  it('no intenta parsear el mensaje de error como JSON (mensaje no válido)', () => {
    const err = { status: 409, body: { error: 'Mensaje sin formato JSON', codigo: 'CLIENTE_ACTIVO_OTRO_GYM', data } }
    expect(tryParseClienteActivoError(err)).toEqual(data)
  })

  it('ignora errores que no son 409', () => {
    expect(tryParseClienteActivoError({ status: 400, body: { error: 'x' } })).toBeNull()
    expect(tryParseClienteActivoError({ status: 401, body: {} })).toBeNull()
    expect(tryParseClienteActivoError(null)).toBeNull()
  })

  it('ignora errores 409 con otro codigo', () => {
    expect(tryParseClienteActivoError({ status: 409, body: { codigo: 'OTRO_ERROR', data } })).toBeNull()
  })

  it('ignora errores sin body', () => {
    expect(tryParseClienteActivoError({ status: 409 })).toBeNull()
  })
})
