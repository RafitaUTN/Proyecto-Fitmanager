import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'

export interface Ejercicio {
  id_ejercicio: number
  nombre: string
  grupo_muscular: string
  descripcion: string | null
  nivel: string
  categoria: string | null
  estado: boolean
  imagen_url: string | null
  animacion_url: string | null
  tipo_media: 'imagen' | 'animacion' | null
  instrucciones: string | null
  equipo: string | null
  musculos_secundarios: string[]
  _count: { rutina_ejercicios: number }
}

export interface EjercicioFiltros {
  buscar?: string
  grupo_muscular?: string
  categoria?: string
  nivel?: string
  estado?: 'activo' | 'inactivo' | 'todos'
  pagina?: number
  limite?: number
}

export interface CatalogoEjercicios {
  data: Ejercicio[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export function useCatalogoEjercicios(filtros: EjercicioFiltros) {
  const params = new URLSearchParams()
  Object.entries(filtros).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)) })
  return useQuery({
    queryKey: ['ejercicios', 'catalogo', filtros],
    queryFn: () => http.get<CatalogoEjercicios>(`/ejercicios/catalogo?${params}`),
    placeholderData: (previous) => previous,
    staleTime: 1000 * 60 * 5,
  })
}

export function useEjercicioDetalle(id?: number) {
  return useQuery({
    queryKey: ['ejercicios', 'detalle', id],
    queryFn: () => http.get<Ejercicio & { rutina_ejercicios: Array<{ rutina: { id_rutina: number; nombre: string; estado: boolean } }> }>(`/ejercicios/${id}`),
    enabled: Boolean(id),
  })
}

export function useEjercicios(enabled?: boolean) {
  return useQuery({
    queryKey: QueryKeys.ejercicios(),
    queryFn: () => http.get<Ejercicio[]>('/ejercicios'),
    staleTime: 1000 * 60 * 5,
    enabled: enabled ?? true,
  })
}

export function useCrearEjercicio(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: { nombre: string; grupo_muscular: string; descripcion?: string; nivel?: string; categoria?: string; imagen_url?: string; animacion_url?: string; tipo_media?: 'imagen' | 'animacion'; instrucciones?: string; equipo?: string; musculos_secundarios?: string[] }) =>
      http.post('/ejercicios', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.ejercicios() })
      emit(DomainEvents.EJERCICIO_CREADO)
      addToast('Ejercicio creado exitosamente', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useActualizarEjercicio(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { nombre?: string; grupo_muscular?: string; descripcion?: string; nivel?: string; categoria?: string; estado?: boolean; imagen_url?: string; animacion_url?: string; tipo_media?: 'imagen' | 'animacion'; instrucciones?: string; equipo?: string; musculos_secundarios?: string[] } }) =>
      http.put(`/ejercicios/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.ejercicios() })
      emit(DomainEvents.EJERCICIO_EDITADO)
      addToast('Ejercicio actualizado', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useEliminarEjercicio() {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id: number) => http.del(`/ejercicios/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.ejercicios() })
      emit(DomainEvents.EJERCICIO_ELIMINADO)
      addToast('Ejercicio eliminado', 'success')
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}
