/**
 * Hook de datos use-transferencias.
 *
 * @remarks Encapsula consultas y mutaciones HTTP con TanStack Query para separar acceso API de la UI.
 */
import { useQuery, useMutation } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'
import { CachePolicy } from '@/lib/cache-policy'

export interface TransferenciaIndicadores {
  recibidas: number
  enviadas: number
}

export interface AuditoriaItem {
  id: number
  accion: string
  id_usuario: number | null
  fecha: string
  ip: string | null
  estado_anterior: string | null
  estado_nuevo: string
  observaciones: string | null
}

export interface SolicitudTransferencia {
  id: number
  estado: string
  fecha_solicitud: string
  fecha_respuesta: string | null
  motivo: string | null
  observaciones: string | null
  cliente: { id_cliente: number; nombre: string; apellido: string; cedula: string }
  gym_origen: { id_gimnasio: number; nombre: string }
  gym_destino: { id_gimnasio: number; nombre: string }
  usuario_solicita: { id_usuario: number; nombre: string; apellido: string }
  usuario_respuesta: { id_usuario: number; nombre: string; apellido: string } | null
  auditorias: AuditoriaItem[]
  notificaciones: { id_notificacion: number; leida: boolean }[]
}

export function useIndicadoresTransferencia() {
  return useQuery({
    queryKey: QueryKeys.transferenciasIndicadores(),
    queryFn: ({ signal }) => http.get<TransferenciaIndicadores>('/transferencias/indicadores', undefined, signal),
    staleTime: CachePolicy.volatile,
  })
}

export function useSolicitudTransferencia(id: number | null) {
  return useQuery({
    queryKey: QueryKeys.transferencias(id ?? undefined),
    queryFn: ({ signal }) => http.get<SolicitudTransferencia>(`/transferencias/${id}`, undefined, signal),
    enabled: !!id,
    staleTime: CachePolicy.volatile,
  })
}

export function useCrearTransferencia(onSuccess?: () => void) {
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: { id_cliente: number; motivo?: string }) => http.post('/transferencias', data),
    onSuccess: () => {
      emit(DomainEvents.TRANSFERENCIA_SOLICITADA)
      addToast('Solicitud de transferencia creada', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useAprobarTransferencia(onSuccess?: () => void) {
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ id, observaciones }: { id: number; observaciones: string }) =>
      http.put(`/transferencias/${id}/aprobar`, { observaciones }),
    onSuccess: () => {
      emit(DomainEvents.TRANSFERENCIA_APROBADA)
      addToast('Transferencia aprobada', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useRechazarTransferencia(onSuccess?: () => void) {
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ id, observaciones }: { id: number; observaciones: string }) =>
      http.put(`/transferencias/${id}/rechazar`, { observaciones }),
    onSuccess: () => {
      emit(DomainEvents.TRANSFERENCIA_RECHAZADA)
      addToast('Transferencia rechazada', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useCancelarTransferencia(onSuccess?: () => void) {
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id: number) => http.put(`/transferencias/${id}/cancelar`, {}),
    onSuccess: () => {
      emit(DomainEvents.TRANSFERENCIA_CANCELADA)
      addToast('Solicitud cancelada', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
