/**
 * Hook de datos use-perfil-cliente.
 *
 * @remarks Encapsula consultas y mutaciones HTTP con TanStack Query para separar acceso API de la UI.
 */
import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { QueryKeys } from '@/lib/query-keys'
import { CachePolicy } from '@/lib/cache-policy'

export interface MembresiaDetalle {
  id: number
  idMembresia: number
  plan: string
  precio: number
  duracionDias: number
  inicio: string
  fin: string
  estado: string
  diasRestantes: number
  progreso: number
}

export interface HistorialMembresia {
  id: number
  plan: string
  precio: number
  duracionDias: number
  inicio: string
  fin: string
  estado: string
}

export interface PerfilCliente {
  cliente: {
    id_cliente: number
    nombre: string
    apellido: string
    cedula: string
    correo: string
    telefono: string | null
    fecha_registro: string
    estado: boolean
    entrenador: { id_usuario: number; nombre: string; apellido: string; estado: boolean } | null
  }
  membresiaActiva: MembresiaDetalle | null
  membresiaVencida: MembresiaDetalle | null
  historial: HistorialMembresia[]
}

export function usePerfilCliente(id: number | null) {
  return useQuery({
    queryKey: QueryKeys.perfilCliente(id ?? 0),
    queryFn: ({ signal }) => http.get<PerfilCliente>(`/clientes/${id}/perfil`, undefined, signal),
    enabled: id !== null && id !== undefined,
    staleTime: CachePolicy.volatile,
  })
}
