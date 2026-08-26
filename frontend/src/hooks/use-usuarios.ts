/**
 * Hook de datos use-usuarios.
 *
 * @remarks Encapsula consultas y mutaciones HTTP con TanStack Query para separar acceso API de la UI.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { QueryKeys } from '@/lib/query-keys'
import { normalizePaginatedResponse, type PaginatedResponse } from '@/lib/pagination'
import { CachePolicy } from '@/lib/cache-policy'

export interface Usuario {
  id_usuario: number
  nombre: string
  apellido: string
  correo: string
  rol: string
  estado: boolean
}

export function useUsuarios(options?: { page?: number; pageSize?: number; search?: string }) {
  return useQuery({
    queryKey: QueryKeys.usuarios(options),
    queryFn: ({ signal }) => {
      const params: Record<string, string> = {}
      if (options?.page) params.page = String(options.page)
      if (options?.pageSize) params.pageSize = String(options.pageSize)
      if (options?.search) params.search = options.search
      return http
        .get<Usuario[] | PaginatedResponse<Usuario>>(
          '/usuarios',
          Object.keys(params).length ? params : undefined,
          signal,
        )
        .then(normalizePaginatedResponse)
    },
    placeholderData: (prev) => prev,
    staleTime: options?.search ? CachePolicy.realtime : CachePolicy.static,
  })
}

export function useCrearUsuario(onSuccess?: () => void) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { nombre: string; apellido: string; correo: string; password: string; rol: string }) =>
      http.post('/usuarios', data),
    onSuccess: () => {
      addToast('Usuario creado exitosamente', 'success')
      queryClient.invalidateQueries({ queryKey: QueryKeys.usuarios() })
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useActualizarUsuario(onSuccess?: () => void) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Usuario> & { password?: string } }) =>
      http.put(`/usuarios/${id}`, data),
    onSuccess: () => {
      addToast('Usuario actualizado', 'success')
      queryClient.invalidateQueries({ queryKey: QueryKeys.usuarios() })
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useEliminarUsuario() {
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => http.del(`/usuarios/${id}`),
    onSuccess: () => {
      addToast('Usuario eliminado', 'success')
      queryClient.invalidateQueries({ queryKey: QueryKeys.usuarios() })
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
