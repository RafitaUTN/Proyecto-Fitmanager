import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { QueryKeys } from '@/lib/query-keys'

export interface Usuario {
  id_usuario: number
  nombre: string
  apellido: string
  correo: string
  rol: string
  estado: boolean
}

export interface UsuariosPagina {
  data: Usuario[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export function useUsuarios(pagina = 1, limite = 20) {
  return useQuery({
    queryKey: QueryKeys.usuarios(pagina),
    queryFn: () => http.get<UsuariosPagina>(`/usuarios?pagina=${pagina}&limite=${limite}`),
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
