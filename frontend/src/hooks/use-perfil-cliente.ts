import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { QueryKeys } from '@/lib/query-keys'

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
    queryFn: () => http.get<PerfilCliente>(`/clientes/${id}/perfil`),
    enabled: id !== null && id !== undefined,
  })
}
