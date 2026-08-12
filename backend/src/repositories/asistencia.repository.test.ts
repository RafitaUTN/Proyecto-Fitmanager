import { describe, expect, it } from 'vitest'
import { whereElegibles } from './asistencia.repository'

describe('whereElegibles', () => {
  const hoy = new Date('2026-08-10T12:00:00')

  it('exige cliente activo del gimnasio', () => {
    const where = whereElegibles(3n, hoy)
    expect(where).toMatchObject({ id_gimnasio: 3n, estado: true })
  })

  it('exige una membresia activa que cubra la fecha actual', () => {
    const where = whereElegibles(3n, hoy)
    expect(where.cliente_membresias).toEqual({
      some: {
        estado: 'activo',
        fecha_inicio: { lte: hoy },
        fecha_fin: { gte: hoy },
      },
    })
  })

  it('excluye clientes con una entrada abierta (sin salida)', () => {
    const where = whereElegibles(3n, hoy)
    expect(where.asistencias).toEqual({ none: { fecha_hora_salida: null } })
  })
})
