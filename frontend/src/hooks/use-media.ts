import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { QueryKeys } from '@/lib/query-keys'

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
    queryFn: () => http.get<ExerciseMediaResponse>('/ejercicios/media/buscar', { buscar: trim, limite: String(limite) }),
    enabled: trim.length > 0,
    staleTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  })
}
