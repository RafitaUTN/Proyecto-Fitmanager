import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'

interface ClientePerfil {
  id_cliente: number
  nombre: string
  apellido: string
  correo: string
  telefono: string | null
  cedula: string | null
  ultimo_acceso: string | null
  nombre_gimnasio: string
  entrenador: { nombre: string; apellido: string } | null
}

interface ClienteMembresia {
  id: number
  plan: { nombre: string; descripcion: string; duracion_dias: number; precio: number }
  fecha_inicio: string
  fecha_fin: string
  estado: string
  progreso: number
  dias_restantes: number
  historial: Array<{ id: number; plan: string; fecha_inicio: string; fecha_fin: string; estado: string }>
}

interface ClienteRutina {
  id: number
  nombre: string
  descripcion: string
  fecha_asignacion: string
  estado: string
  ejercicios: Array<{
    id: number
    nombre: string
    descripcion: string
    series: number
    repeticiones: string
    peso: string | null
    notas: string | null
  }>
}

export function useClientePerfil() {
  return useQuery<ClientePerfil>({
    queryKey: ['cliente', 'perfil'],
    queryFn: ({ signal }) => http.get<ClientePerfil>('/cliente/me', undefined, signal),
  })
}

export function useClienteMembresia() {
  return useQuery<ClienteMembresia>({
    queryKey: ['cliente', 'membresia'],
    queryFn: ({ signal }) => http.get<ClienteMembresia>('/cliente/me/membresia', undefined, signal),
  })
}

export function useClienteRutinas() {
  return useQuery<ClienteRutina[]>({
    queryKey: ['cliente', 'rutinas'],
    queryFn: ({ signal }) => http.get<ClienteRutina[]>('/cliente/me/rutinas', undefined, signal),
  })
}

export function useCambiarPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { contrasena_actual: string; contrasena_nueva: string }) =>
      http.put<{ mensaje: string }>('/cliente/me/contrasena', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', 'perfil'] })
    },
  })
}