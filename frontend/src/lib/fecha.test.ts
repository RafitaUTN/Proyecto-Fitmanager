import { describe, expect, it } from 'vitest'
import { formatFecha, formatMes, formatDia, esFechaVencida, diaNegocioActual } from './fecha'

describe('formato de fechas de calendario', () => {
  it('no desplaza fechas UTC a medianoche hacia el día anterior', () => {
    expect(formatFecha('2026-08-11T00:00:00.000Z')).toBe('11/8/2026')
    expect(formatFecha('2026-09-10T00:00:00.000Z')).toBe('10/9/2026')
  })

  it('acepta solo la parte de fecha', () => {
    expect(formatFecha('2026-08-11')).toBe('11/8/2026')
  })

  it('acepta objetos Date', () => {
    expect(formatFecha(new Date('2026-08-11T00:00:00.000Z'))).toBe('11/8/2026')
  })

  it('devuelve guión para valores nulos o inválidos', () => {
    expect(formatFecha(null)).toBe('-')
    expect(formatFecha(undefined)).toBe('-')
    expect(formatFecha('')).toBe('-')
    expect(formatFecha('no-es-fecha')).toBe('-')
  })

  it('formatea meses y días para las gráficas', () => {
    expect(formatMes('2026-08-01T00:00:00.000Z')).toContain('ago')
    expect(formatDia('2026-08-11T00:00:00.000Z')).toContain('ago')
  })
})

describe('vigencia por día de negocio', () => {
  // Costa Rica es UTC-6 todo el año, sin horario de verano.
  const manana = new Date('2026-08-25T15:00:00.000Z') // 25/8 09:00 en Costa Rica

  it('marca vencida una fecha anterior al día actual', () => {
    expect(esFechaVencida('2026-08-24T00:00:00.000Z', manana)).toBe(true)
  })

  it('no marca vencido el propio día de vencimiento', () => {
    expect(esFechaVencida('2026-08-25T00:00:00.000Z', manana)).toBe(false)
  })

  it('no marca vencida una fecha futura', () => {
    expect(esFechaVencida('2026-09-05T00:00:00.000Z', manana)).toBe(false)
  })

  it('resuelve el día en Costa Rica y no en UTC', () => {
    const madrugadaUtc = new Date('2026-08-25T02:00:00.000Z') // 24/8 20:00 en Costa Rica
    expect(diaNegocioActual(madrugadaUtc)).toBe('2026-08-24')
    expect(esFechaVencida('2026-08-24T00:00:00.000Z', madrugadaUtc)).toBe(false)
  })

  it('devuelve false para valores nulos o inválidos', () => {
    expect(esFechaVencida(null)).toBe(false)
    expect(esFechaVencida(undefined)).toBe(false)
    expect(esFechaVencida('')).toBe(false)
    expect(esFechaVencida('no-es-fecha')).toBe(false)
  })
})
