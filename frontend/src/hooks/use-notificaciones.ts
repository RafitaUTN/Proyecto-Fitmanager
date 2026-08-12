import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'

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

export function useNotificaciones(tipo?: string) {
  return useQuery({
    queryKey: QueryKeys.notificaciones(tipo),
    queryFn: () => {
      const params = tipo ? `?tipo=${tipo}` : ''
      return http.get<Notificacion[]>(`/notificaciones${params}`)
    },
  })
}

export function useContarNoLeidas() {
  return useQuery({
    queryKey: QueryKeys.notificacionesContar(),
    queryFn: () => http.get<{ total: number }>('/notificaciones/contar'),
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
