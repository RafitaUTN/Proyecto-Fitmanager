/**
 * Pruebas unitarias de ejercicio.service
 *
 * El catálogo de ejercicios es la base sobre la que se arman las rutinas del
 * RF-13. La regla que importa aquí es la de integridad referencial: no se
 * puede borrar un ejercicio que alguna rutina esté usando, porque dejaría
 * rutinas apuntando a un registro inexistente.
 *
 * Eso conecta con el RNF-09 (integridad de datos), que pide garantizarla
 * "mediante claves foráneas, restricciones de base de datos y validaciones de
 * negocio". Esta es la validación de negocio.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const GIMNASIO = 1n
const OTRO_GIMNASIO = 2n
const ID_EJERCICIO = 50n

vi.mock('../repositories/ejercicio.repository', () => ({
  ejercicioRepository: {
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    estaEnUso: vi.fn(),
  },
}))

import { ejercicioService } from './ejercicio.service'
import { ejercicioRepository } from '../repositories/ejercicio.repository'

const ejercicio = {
  id_ejercicio: ID_EJERCICIO,
  id_gimnasio: GIMNASIO,
  nombre: 'Sentadilla',
  grupo_muscular: 'Piernas',
  nivel: 'Principiante',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(ejercicioRepository.buscarPorId).mockResolvedValue(ejercicio as never)
  vi.mocked(ejercicioRepository.estaEnUso).mockResolvedValue(false as never)
  vi.mocked(ejercicioRepository.crear).mockResolvedValue(ejercicio as never)
  vi.mocked(ejercicioRepository.actualizar).mockResolvedValue(ejercicio as never)
  vi.mocked(ejercicioRepository.eliminar).mockResolvedValue(ejercicio as never)
})

// ===========================================================================
describe('Catálogo de ejercicios', () => {
  it('crea el ejercicio dentro del gimnasio del token', async () => {
    await ejercicioService.crear(GIMNASIO, {
      nombre: 'Press banca',
      grupo_muscular: 'Pecho',
      descripcion: 'Con barra',
      nivel: 'Intermedio',
      categoria: 'Fuerza',
    } as never)

    const datos = vi.mocked(ejercicioRepository.crear).mock.calls[0][0] as {
      id_gimnasio: bigint
      nombre: string
    }
    expect(datos.id_gimnasio).toBe(GIMNASIO)
    expect(datos.nombre).toBe('Press banca')
  })

  it('lista acotado al gimnasio', async () => {
    vi.mocked(ejercicioRepository.listar).mockResolvedValue([] as never)

    await ejercicioService.listar(GIMNASIO)

    expect(ejercicioRepository.listar).toHaveBeenCalledWith(GIMNASIO)
  })
})

// ===========================================================================
describe('Aislamiento entre gimnasios', () => {
  beforeEach(() => {
    vi.mocked(ejercicioRepository.buscarPorId).mockResolvedValue({
      ...ejercicio,
      id_gimnasio: OTRO_GIMNASIO,
    } as never)
  })

  it('no permite modificar un ejercicio de otro gimnasio', async () => {
    await expect(
      ejercicioService.actualizar(ID_EJERCICIO, GIMNASIO, { nombre: 'Cambiado' } as never),
    ).rejects.toMatchObject({ message: 'Ejercicio no encontrado', statusCode: 404 })

    expect(ejercicioRepository.actualizar).not.toHaveBeenCalled()
  })

  it('no permite eliminar un ejercicio de otro gimnasio', async () => {
    await expect(ejercicioService.eliminar(ID_EJERCICIO, GIMNASIO)).rejects.toMatchObject({
      statusCode: 404,
    })

    expect(ejercicioRepository.eliminar).not.toHaveBeenCalled()
  })

  it('ni siquiera consulta si está en uso cuando el ejercicio es ajeno', async () => {
    await ejercicioService.eliminar(ID_EJERCICIO, GIMNASIO).catch(() => undefined)

    expect(ejercicioRepository.estaEnUso).not.toHaveBeenCalled()
  })
})

// ===========================================================================
describe('RNF-09 · Integridad referencial al eliminar', () => {
  it('impide borrar un ejercicio que está en uso en alguna rutina', async () => {
    vi.mocked(ejercicioRepository.estaEnUso).mockResolvedValue(true as never)

    await expect(ejercicioService.eliminar(ID_EJERCICIO, GIMNASIO)).rejects.toMatchObject({
      message: 'No se puede eliminar un ejercicio que está siendo usado en rutinas',
      statusCode: 409,
    })

    expect(ejercicioRepository.eliminar).not.toHaveBeenCalled()
  })

  it('sí permite borrarlo cuando ninguna rutina lo usa', async () => {
    await ejercicioService.eliminar(ID_EJERCICIO, GIMNASIO)

    expect(ejercicioRepository.eliminar).toHaveBeenCalledWith(ID_EJERCICIO)
  })

  it('rechaza eliminar un ejercicio inexistente', async () => {
    vi.mocked(ejercicioRepository.buscarPorId).mockResolvedValue(null as never)

    await expect(ejercicioService.eliminar(ID_EJERCICIO, GIMNASIO)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
