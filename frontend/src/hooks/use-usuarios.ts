import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'

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
    queryKey: ['usuarios'],
    queryFn: () => http.get<Usuario[]>('/usuarios'),
  })
}

export function useCrearUsuario(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: { nombre: string; apellido: string; correo: string; password: string; rol: string }) =>
      http.post('/usuarios', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      addToast('Usuario creado exitosamente', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useActualizarUsuario(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Usuario> }) =>
      http.put(`/usuarios/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      addToast('Usuario actualizado', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

export function useEliminarUsuario() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id: number) => http.del(`/usuarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      addToast('Usuario eliminado', 'success')
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
