import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { QueryKeys } from '@/lib/query-keys'

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
    queryFn: () => http.get<DashboardAdminIndicadores>('/dashboard/indicadores'),
  })
}

export function useDashboardRecepcion() {
  return useQuery({
    queryKey: QueryKeys.dashboardRecepcion(),
    queryFn: () => http.get<DashboardRecepcionIndicadores>('/dashboard/indicadores'),
  })
}

export function useDashboardEntrenador() {
  return useQuery({
    queryKey: QueryKeys.dashboardEntrenador(),
    queryFn: () => http.get<DashboardEntrenadorIndicadores>('/dashboard/indicadores'),
  })
}
