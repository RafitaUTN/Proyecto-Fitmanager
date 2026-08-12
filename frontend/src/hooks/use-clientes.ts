import { useQuery, useMutation } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'

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

export function useClientes(options?: { q?: string; cedula?: string; id_entrenador?: string }) {
  return useQuery({
    queryKey: QueryKeys.clientes(options as Record<string, string>),
    queryFn: () => {
      const params: Record<string, string> = {}
      if (options?.q) params.q = options.q
      if (options?.cedula) params.cedula = options.cedula
      if (options?.id_entrenador) params.id_entrenador = options.id_entrenador
      return http.get<Cliente[]>('/clientes', Object.keys(params).length > 0 ? params : undefined)
    },
    placeholderData: (prev) => prev,
  })
}

export function useCrearCliente(onSuccess?: () => void) {
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: {
      nombre: string; apellido: string; cedula: string
      telefono?: string; correo: string; fecha_nacimiento?: string
    }) => http.post<{ id_cliente: number }>('/clientes', data),
    onSuccess: () => {
      emit(DomainEvents.CLIENTE_CREADO)
      addToast('Cliente creado exitosamente', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useActualizarCliente(onSuccess?: () => void) {
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Cliente> }) =>
      http.put(`/clientes/${id}`, data),
    onSuccess: () => {
      emit(DomainEvents.CLIENTE_ACTUALIZADO)
      addToast('Cliente actualizado', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useEliminarCliente() {
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id: number) => http.del(`/clientes/${id}`),
    onSuccess: () => {
      emit(DomainEvents.CLIENTE_ELIMINADO)
      addToast('Cliente eliminado', 'success')
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
