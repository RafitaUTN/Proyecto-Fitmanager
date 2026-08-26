/**
 * Hook de datos use-media.
 *
 * @remarks Encapsula consultas y mutaciones HTTP con TanStack Query para separar acceso API de la UI.
 */
import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { QueryKeys } from '@/lib/query-keys'
import { CachePolicy } from '@/lib/cache-policy'

export interface ExerciseMediaResult {
  id_externo: string
  nombre: string
  descripcion?: string
  imagen_url: string
  tipo_media: 'imagen'
  grupo_muscular?: string
  equipo?: string
  musculos_secundarios: string[]
  licencia?: string
  autor?: string
  fuente: string
}

export interface ExerciseMediaResponse {
  data: ExerciseMediaResult[]
  fuente: 'vacio' | 'cache' | 'proveedor' | 'error'
  error?: string
}

export function useBuscarMediaEjercicios(query: string, limite = 8) {
  const trim = query.trim()
  return useQuery({
    queryKey: QueryKeys.mediaEjercicios(trim),
    queryFn: ({ signal }) =>
      http.get<ExerciseMediaResponse>('/ejercicios/media/buscar', { buscar: trim, limite: String(limite) }, signal),
    enabled: trim.length > 0,
    staleTime: CachePolicy.externalMedia,
    retry: 1,
  })
}
