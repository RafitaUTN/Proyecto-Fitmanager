/**
 * Hook de datos use-notificaciones.
 *
 * @remarks Encapsula consultas y mutaciones HTTP con TanStack Query para separar acceso API de la UI.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'
import { normalizePaginatedResponse, type PaginatedResponse } from '@/lib/pagination'
import { CachePolicy } from '@/lib/cache-policy'

export interface Notificacion {
  id_notificacion: number
  titulo: string
  mensaje: string
  fecha_envio: string
  leida: boolean
  tipo: 'MEMBRESIA' | 'TRANSFERENCIA' | 'SISTEMA'
  accion_url: string | null
  cliente: { nombre: string; apellido: string } | null
  solicitud: { id: number; estado: string } | null
}

export function useNotificaciones(tipo?: string, options?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: QueryKeys.notificaciones(tipo, options),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams()
      if (tipo) params.set('tipo', tipo)
      if (options?.page) params.set('page', String(options.page))
      if (options?.pageSize) params.set('pageSize', String(options.pageSize))
      const qs = params.toString() ? `?${params.toString()}` : ''
      return http
        .get<Notificacion[] | PaginatedResponse<Notificacion>>(`/notificaciones${qs}`, undefined, signal)
        .then(normalizePaginatedResponse)
    },
    placeholderData: (prev) => prev,
    staleTime: CachePolicy.volatile,
  })
}

export function useContarNoLeidas() {
  return useQuery({
    queryKey: QueryKeys.notificacionesContar(),
    queryFn: ({ signal }) => http.get<{ total: number }>('/notificaciones/contar', undefined, signal),
    staleTime: CachePolicy.volatile,
  })
}

export function useMarcarLeida() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => http.put(`/notificaciones/${id}/leer`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notificaciones() })
      queryClient.invalidateQueries({ queryKey: QueryKeys.notificacionesContar() })
      emit(DomainEvents.NOTIFICACION_LEIDA)
    },
  })
}

export function useGenerarAlertas() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: () => http.post('/notificaciones/generar'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notificaciones() })
      queryClient.invalidateQueries({ queryKey: QueryKeys.notificacionesContar() })
      emit(DomainEvents.NOTIFICACION_LEIDA)
      addToast('Alertas generadas', 'success')
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
