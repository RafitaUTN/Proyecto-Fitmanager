import { useQuery, useMutation } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { QueryKeys } from '@/lib/query-keys'

export interface MiPerfil {
  id_usuario: number
  nombre: string
  apellido: string
  correo: string
  rol: string
  estado: boolean
  nombre_gimnasio: string
  fecha_creacion: string
}

export function useMiPerfil() {
  return useQuery({
    queryKey: QueryKeys.miPerfil(),
    queryFn: () => http.get<MiPerfil>('/usuarios/me'),
  })
}

export function useCambiarPasswordStaff() {
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: { contrasena_actual: string; contrasena_nueva: string; confirmar_password: string }) =>
      http.put('/usuarios/me/contrasena', data),
    onSuccess: () => {
      addToast('Contraseña actualizada correctamente.', 'success')
    },
  })
}
