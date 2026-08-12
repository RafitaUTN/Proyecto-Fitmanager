import { describe, expect, it } from 'vitest'
import { formatFecha, formatMes, formatDia } from './fecha'

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
