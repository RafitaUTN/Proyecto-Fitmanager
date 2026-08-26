/**
 * Hook de datos use-dashboard.
 *
 * @remarks Encapsula consultas y mutaciones HTTP con TanStack Query para separar acceso API de la UI.
 */
import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { QueryKeys } from '@/lib/query-keys'
import { CachePolicy } from '@/lib/cache-policy'

export interface DashboardAdminIndicadores {
  totalClientes: number
  clientesActivos: number
  clientesHoy: number
  totalPagos: number
  pagosHoy: number
  transferenciasRecibidas: number
  transferenciasEnviadas: number
  ingresos: number
  totalMembresias: number
  totalUsuarios: number
  asistenciasHoy: number
}

export interface DashboardRecepcionIndicadores {
  clientesHoy: number
  pagosHoy: number
  asistenciasHoy: number
  membresiasPorVencer: number
}

export interface DashboardEntrenadorIndicadores {
  misClientes: number
  rutinasActivas: number
  clientesPresentesHoy: number
  notificaciones: number
}

export function useDashboardAdmin() {
  return useQuery({
    queryKey: QueryKeys.dashboardAdmin(),
    queryFn: ({ signal }) => http.get<DashboardAdminIndicadores>('/dashboard/indicadores', undefined, signal),
    staleTime: CachePolicy.volatile,
  })
}

export function useDashboardRecepcion() {
  return useQuery({
    queryKey: QueryKeys.dashboardRecepcion(),
    queryFn: ({ signal }) => http.get<DashboardRecepcionIndicadores>('/dashboard/indicadores', undefined, signal),
    staleTime: CachePolicy.volatile,
  })
}

export function useDashboardEntrenador() {
  return useQuery({
    queryKey: QueryKeys.dashboardEntrenador(),
    queryFn: ({ signal }) => http.get<DashboardEntrenadorIndicadores>('/dashboard/indicadores', undefined, signal),
    staleTime: CachePolicy.volatile,
  })
}
