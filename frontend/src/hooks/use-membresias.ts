import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'
import { QueryKeys } from '@/lib/query-keys'

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
    queryFn: () => http.get<Membresia[]>('/membresias'),
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
    mutationFn: ({ id, data }: { id: number; data: Partial<Membresia> }) =>
      http.put(`/membresias/${id}`, data),
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
