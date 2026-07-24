import { useQuery, useMutation } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'
import { QueryKeys } from '@/lib/query-keys'

export interface Usuario {
  id_usuario: number
  nombre: string
  apellido: string
  correo: string
  rol: string
  estado: boolean
}

export function useUsuarios() {
  return useQuery({
    queryKey: QueryKeys.usuarios(),
    queryFn: () => http.get<Usuario[]>('/usuarios'),
  })
}

export function useCrearUsuario(onSuccess?: () => void) {
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: { nombre: string; apellido: string; correo: string; password: string; rol: string }) =>
      http.post('/usuarios', data),
    onSuccess: () => {
      addToast('Usuario creado exitosamente', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useActualizarUsuario(onSuccess?: () => void) {
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Usuario> }) =>
      http.put(`/usuarios/${id}`, data),
    onSuccess: () => {
      addToast('Usuario actualizado', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useEliminarUsuario() {
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id: number) => http.del(`/usuarios/${id}`),
    onSuccess: () => {
      addToast('Usuario eliminado', 'success')
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
