/**
 * Hook de datos use-mi-perfil.
 *
 * @remarks Encapsula consultas y mutaciones HTTP con TanStack Query para separar acceso API de la UI.
 */
import { useQuery, useMutation } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { QueryKeys } from '@/lib/query-keys'
import { CachePolicy } from '@/lib/cache-policy'

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
    queryFn: ({ signal }) => http.get<MiPerfil>('/usuarios/me', undefined, signal),
    staleTime: CachePolicy.static,
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
