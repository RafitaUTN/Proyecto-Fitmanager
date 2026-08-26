/**
 * Hook de datos use-membresias.
 *
 * @remarks Encapsula consultas y mutaciones HTTP con TanStack Query para separar acceso API de la UI.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { QueryKeys } from '@/lib/query-keys'
import { CachePolicy } from '@/lib/cache-policy'

export interface Membresia {
  id_membresia: number
  nombre: string
  descripcion: string | null
  precio: number
  duracion_dias: number
  estado: boolean
}

export function useMembresias() {
  return useQuery({
    queryKey: QueryKeys.membresias(),
    queryFn: ({ signal }) => http.get<Membresia[]>('/membresias', undefined, signal),
    staleTime: CachePolicy.static,
  })
}

export function useCrearMembresia(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: { nombre: string; descripcion?: string; precio: number; duracion_dias: number }) =>
      http.post('/membresias', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.membresias() })
      addToast('Plan creado exitosamente', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useActualizarMembresia(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Membresia> }) => http.put(`/membresias/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.membresias() })
      addToast('Plan actualizado', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useEliminarMembresia() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id: number) => http.del(`/membresias/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.membresias() })
      addToast('Plan eliminado', 'success')
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
