import { crearWgerMediaProvider } from '../exercises/wger-media.provider'
import type { ExerciseMediaProvider, ExerciseMediaResult } from '../exercises/exercise-media-provider.interface'
import type { ExerciseMediaCacheEntry } from '../repositories/exercise-media-cache.repository'

export type ExerciseMediaSource = 'vacio' | 'cache' | 'proveedor' | 'error'

export interface ExerciseMediaSearchResult {
  data: ExerciseMediaResult[]
  fuente: ExerciseMediaSource
  error?: string
}

export interface ExerciseMediaCachePort {
  buscar(clave: string): Promise<ExerciseMediaCacheEntry | null>
  guardar(clave: string, resultado: ExerciseMediaResult[]): Promise<void>
}

const TTL_POR_DEFECTO = 7 * 24 * 60 * 60 * 1000

export function crearExerciseMediaService(opts: {
  proveedor?: ExerciseMediaProvider
  cache?: ExerciseMediaCachePort
  cacheTtlMs?: number
} = {}) {
  const cache = opts.cache
  const ttlMs = opts.cacheTtlMs ?? TTL_POR_DEFECTO
  const enMemoria = new Map<string, { data: ExerciseMediaResult[]; venceEn: number }>()

  let proveedor = opts.proveedor
  async function obtenerProveedor(): Promise<ExerciseMediaProvider> {
    if (!proveedor) {
      proveedor = crearWgerMediaProvider({
        baseUrl: process.env.EXERCISE_MEDIA_BASE_URL || 'https://wger.de',
        timeoutMs: Number(process.env.EXERCISE_MEDIA_TIMEOUT_MS) || 6000,
      })
    }
    return proveedor
  }

  async function buscar(query: string, limite = 8): Promise<ExerciseMediaSearchResult> {
    const clave = normalizarClave(query)
    if (!clave) return { data: [], fuente: 'vacio' }

    const ahora = Date.now()
    const enMemoriaHit = enMemoria.get(clave)
    if (enMemoriaHit && enMemoriaHit.venceEn > ahora) {
      return { data: enMemoriaHit.data, fuente: 'cache' }
    }

    if (cache) {
      const enBd = await cache.buscar(clave)
      if (enBd && ahora - enBd.actualizadoEn.getTime() < ttlMs) {
        enMemoria.set(clave, { data: enBd.resultado, venceEn: ahora + ttlMs })
        return { data: enBd.resultado, fuente: 'cache' }
      }
    }

    try {
      const provider = await obtenerProveedor()
      const data = await provider.buscar(clave, limite)
      enMemoria.set(clave, { data, venceEn: Date.now() + ttlMs })
      if (cache && data.length > 0) {
        await cache.guardar(clave, data)
      }
      return { data, fuente: 'proveedor' }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo consultar el catálogo externo'
      enMemoria.set(clave, { data: [], venceEn: Date.now() + 60_000 })
      return { data: [], fuente: 'error', error: mensaje }
    }
  }

  return { buscar }
}

export const exerciseMediaService = crearExerciseMediaService()

function normalizarClave(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 100)
}
