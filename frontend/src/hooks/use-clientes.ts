import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'

export interface Cliente {
  id_cliente: number
  nombre: string
  apellido: string
  cedula: string
  telefono: string | null
  correo: string
  fecha_nacimiento: string | null
  fecha_registro: string
  estado: boolean
}

export function useClientes(q?: string, cedula?: string) {
  return useQuery({
    queryKey: ['clientes', { q, cedula }],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (q) params.q = q
      if (cedula) params.cedula = cedula
      return http.get<Cliente[]>('/clientes', Object.keys(params).length > 0 ? params : undefined)
    },
  })
}

export function useCrearCliente(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: {
      nombre: string; apellido: string; cedula: string
      telefono?: string; correo: string; fecha_nacimiento?: string
    }) => http.post<{ id_cliente: number }>('/clientes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      addToast('Cliente creado exitosamente', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useActualizarCliente(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Cliente> }) =>
      http.put(`/clientes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      addToast('Cliente actualizado', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useEliminarCliente() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id: number) => http.del(`/clientes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      addToast('Cliente eliminado', 'success')
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
