import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'

async function apiClienteGet<T>(path: string): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${import.meta.env.VITE_API_URL}/cliente${path}`, { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

async function apiClientePut<T>(path: string, body: unknown): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${import.meta.env.VITE_API_URL}/cliente${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

interface ClientePerfil {
  id_cliente: number
  nombre: string
  apellido: string
  correo: string
  telefono: string | null
  cedula: string | null
  contrasena_temporal: boolean
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
    queryFn: () => apiClienteGet<ClientePerfil>('/me'),
  })
}

export function useClienteMembresia() {
  return useQuery<ClienteMembresia>({
    queryKey: ['cliente', 'membresia'],
    queryFn: () => apiClienteGet<ClienteMembresia>('/me/membresia'),
  })
}

export function useClienteRutinas() {
  return useQuery<ClienteRutina[]>({
    queryKey: ['cliente', 'rutinas'],
    queryFn: () => apiClienteGet<ClienteRutina[]>('/me/rutinas'),
  })
}

export function useCambiarPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { contrasena_actual: string; contrasena_nueva: string }) =>
      apiClientePut<{ mensaje: string }>('/me/contrasena', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', 'perfil'] })
    },
  })
}