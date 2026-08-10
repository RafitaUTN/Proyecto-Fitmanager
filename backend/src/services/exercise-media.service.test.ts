import { describe, it, expect, vi, beforeEach } from 'vitest'
import { crearExerciseMediaService } from './exercise-media.service'
import type { ExerciseMediaProvider, ExerciseMediaResult } from '../exercises/exercise-media-provider.interface'
import type { ExerciseMediaCachePort } from './exercise-media.service'

function fabResultado(nombre: string): ExerciseMediaResult {
  return { id_externo: '1', nombre, imagen_url: 'https://wger.de/media/1.png', tipo_media: 'imagen', musculos_secundarios: [], fuente: 'wger' }
}

function crearDeps() {
  const proveedor: ExerciseMediaProvider = {
    nombre: 'wger',
    buscar: vi.fn(async (q: string, _limite?: number) => [fabResultado(`Resultado ${q}`)]),
  }
  const cache: ExerciseMediaCachePort = {
    buscar: vi.fn(async () => null),
    guardar: vi.fn(async () => undefined),
  }
  return { proveedor, cache }
}

describe('crearExerciseMediaService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('devuelve vacío sin consultar nada cuando la consulta está vacía', async () => {
    const { proveedor, cache } = crearDeps()
    const service = crearExerciseMediaService({ proveedor, cache })

    const resultado = await service.buscar('   ', 8)
    expect(resultado).toEqual({ data: [], fuente: 'vacio' })
    expect(proveedor.buscar).not.toHaveBeenCalled()
    expect(cache.buscar).not.toHaveBeenCalled()
  })

  it('consulta al proveedor en frío, guarda en caché y reporta fuente proveedor', async () => {
    const { proveedor, cache } = crearDeps()
    const service = crearExerciseMediaService({ proveedor, cache, cacheTtlMs: 60_000 })

    const resultado = await service.buscar('Press Banca', 8)

    expect(proveedor.buscar).toHaveBeenCalledWith('press banca', 8)
    expect(cache.guardar).toHaveBeenCalled()
    expect(resultado.fuente).toBe('proveedor')
    expect(resultado.data[0].nombre).toBe('Resultado press banca')
  })

  it('sirve desde caché BD sin llamar al proveedor cuando el dato está vigente', async () => {
    const { proveedor, cache } = crearDeps()
    cache.buscar = vi.fn(async () => ({
      resultado: [fabResultado('De caché')],
      actualizadoEn: new Date(Date.now() - 1000),
    }))
    const service = crearExerciseMediaService({ proveedor, cache, cacheTtlMs: 60_000 })

    const resultado = await service.buscar('press', 8)

    expect(proveedor.buscar).not.toHaveBeenCalled()
    expect(cache.guardar).not.toHaveBeenCalled()
    expect(resultado.fuente).toBe('cache')
    expect(resultado.data[0].nombre).toBe('De caché')
  })

  it('re-consulta al proveedor cuando el dato en BD está vencido', async () => {
    const { proveedor, cache } = crearDeps()
    cache.buscar = vi.fn(async () => ({
      resultado: [fabResultado('Viejo')],
      actualizadoEn: new Date(Date.now() - 10 * 60 * 1000),
    }))
    const service = crearExerciseMediaService({ proveedor, cache, cacheTtlMs: 60_000 })

    const resultado = await service.buscar('press', 8)
    expect(proveedor.buscar).toHaveBeenCalledTimes(1)
    expect(resultado.fuente).toBe('proveedor')
  })

  it('usa la caché en memoria para llamadas repetidas dentro del TTL', async () => {
    const { proveedor, cache } = crearDeps()
    const service = crearExerciseMediaService({ proveedor, cache, cacheTtlMs: 60_000 })

    await service.buscar('press', 8)
    await service.buscar('press', 8)

    expect(proveedor.buscar).toHaveBeenCalledTimes(1)
    expect(cache.buscar).toHaveBeenCalledTimes(1)
  })

  it('no lanza cuando el proveedor falla: devuelve error con data vacía', async () => {
    const { proveedor, cache } = crearDeps()
    proveedor.buscar = vi.fn(async () => { throw new Error('El catálogo externo respondió 503') })
    const service = crearExerciseMediaService({ proveedor, cache, cacheTtlMs: 60_000 })

    const resultado = await service.buscar('press', 8)
    expect(resultado.fuente).toBe('error')
    expect(resultado.data).toEqual([])
    expect(resultado.error).toContain('503')
  })

  it('no persiste resultados vacíos en la caché', async () => {
    const { proveedor, cache } = crearDeps()
    proveedor.buscar = vi.fn(async () => [])
    const service = crearExerciseMediaService({ proveedor, cache, cacheTtlMs: 60_000 })

    const resultado = await service.buscar('sin-resultados', 8)
    expect(resultado.fuente).toBe('proveedor')
    expect(cache.guardar).not.toHaveBeenCalled()
  })
})
