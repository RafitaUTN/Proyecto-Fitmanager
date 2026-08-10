import { describe, expect, it } from 'vitest'
import { crearRutinaSchema } from './rutina.dto.js'

describe('crearRutinaSchema', () => {
  it('normaliza una rutina visual y conserva el orden indicado', () => {
    const rutina = crearRutinaSchema.parse({
      nombre: 'Fuerza superior',
      objetivo: 'Mejorar fuerza y técnica',
      duracion_minutos: '55',
      dificultad: 'intermedio',
      ejercicios: [
        { id_ejercicio: '9', series: '4', repeticiones: '8', descanso: '90', notas: 'Controlar la bajada', orden: '0' },
        { id_ejercicio: '3', series: '3', repeticiones: '12', orden: '1' },
      ],
    })

    expect(rutina.duracion_minutos).toBe(55)
    expect(rutina.ejercicios.map((exercise) => exercise.orden)).toEqual([0, 1])
    expect(rutina.ejercicios[0].descanso).toBe(90)
  })

  it('rechaza dificultad, duración y descanso fuera del contrato', () => {
    const result = crearRutinaSchema.safeParse({
      nombre: 'Inválida',
      duracion_minutos: 601,
      dificultad: 'experto',
      ejercicios: [{ id_ejercicio: 1, series: 3, repeticiones: 10, descanso: 3601 }],
    })

    expect(result.success).toBe(false)
  })
})
