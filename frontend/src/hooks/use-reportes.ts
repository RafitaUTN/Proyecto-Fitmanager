/**
 * Hook de datos use-reportes.
 *
 * @remarks Encapsula consultas y mutaciones HTTP con TanStack Query para separar acceso API de la UI.
 */
import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { QueryKeys } from '@/lib/query-keys'
import { CachePolicy } from '@/lib/cache-policy'

export interface IngresoMensual {
  mes: string
  total: number
  cantidad: number
}

export interface NuevoCliente {
  mes: string
  cantidad: number
}

export interface DistribucionMembresia {
  nombre: string
  total: number
}

export interface MetodoPago {
  metodo_pago: string
  cantidad: number
  total: number
}

export interface ClientesActivosInactivos {
  activos: number
  inactivos: number
}

interface ReportQueryOptions {
  enabled?: boolean
}

export function useIngresosMensuales(
  filters?: { fecha_inicio?: string; fecha_fin?: string },
  options?: ReportQueryOptions,
) {
  const params = filters?.fecha_inicio || filters?.fecha_fin ? ({ ...filters } as Record<string, string>) : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.ingresosMensuales(), filters],
    queryFn: ({ signal }) => http.get<IngresoMensual[]>('/reportes/ingresos-mensuales', params, signal),
    enabled: options?.enabled ?? true,
    staleTime: CachePolicy.standard,
  })
}

export function useNuevosClientes(
  filters?: { fecha_inicio?: string; fecha_fin?: string },
  options?: ReportQueryOptions,
) {
  const params = filters?.fecha_inicio || filters?.fecha_fin ? ({ ...filters } as Record<string, string>) : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.nuevosClientes(), filters],
    queryFn: ({ signal }) => http.get<NuevoCliente[]>('/reportes/nuevos-clientes', params, signal),
    enabled: options?.enabled ?? true,
    staleTime: CachePolicy.standard,
  })
}

export function useDistribucionMembresias(options?: ReportQueryOptions) {
  return useQuery({
    queryKey: QueryKeys.reportes.distribucionMembresias(),
    queryFn: ({ signal }) => http.get<DistribucionMembresia[]>('/reportes/distribucion-membresias', undefined, signal),
    enabled: options?.enabled ?? true,
    staleTime: CachePolicy.standard,
  })
}

export function useMetodosPago(
  filters?: { fecha_inicio?: string; fecha_fin?: string; metodo_pago?: string },
  options?: ReportQueryOptions,
) {
  const params =
    filters?.fecha_inicio || filters?.fecha_fin || filters?.metodo_pago
      ? ({ ...filters } as Record<string, string>)
      : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.metodosPago(), filters],
    queryFn: ({ signal }) => http.get<MetodoPago[]>('/reportes/metodos-pago', params, signal),
    enabled: options?.enabled ?? true,
    staleTime: CachePolicy.standard,
  })
}

export function useClientesActivosInactivos(options?: ReportQueryOptions) {
  return useQuery({
    queryKey: QueryKeys.reportes.clientesActivosInactivos(),
    queryFn: ({ signal }) =>
      http.get<ClientesActivosInactivos>('/reportes/clientes-activos-inactivos', undefined, signal),
    enabled: options?.enabled ?? true,
    staleTime: CachePolicy.standard,
  })
}

export function useAsistenciasReporte(
  filters?: { fecha_inicio?: string; fecha_fin?: string },
  options?: ReportQueryOptions,
) {
  const params = filters?.fecha_inicio || filters?.fecha_fin ? ({ ...filters } as Record<string, string>) : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.asistencias(), filters],
    queryFn: ({ signal }) => http.get<NuevoCliente[]>('/reportes/asistencias', params, signal),
    enabled: options?.enabled ?? true,
    staleTime: CachePolicy.standard,
  })
}

export function useAsistenciasPorHora(
  filters?: { fecha_inicio?: string; fecha_fin?: string },
  options?: ReportQueryOptions,
) {
  const params = filters?.fecha_inicio || filters?.fecha_fin ? ({ ...filters } as Record<string, string>) : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.asistenciasPorHora(), filters],
    queryFn: ({ signal }) =>
      http.get<{ hora: number; cantidad: number }[]>('/reportes/asistencias-por-hora', params, signal),
    enabled: options?.enabled ?? true,
    staleTime: CachePolicy.standard,
  })
}

export function useIngresosDiarios(
  filters?: { fecha_inicio?: string; fecha_fin?: string },
  options?: ReportQueryOptions,
) {
  const params = filters?.fecha_inicio || filters?.fecha_fin ? ({ ...filters } as Record<string, string>) : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.ingresosDiarios(), filters],
    queryFn: ({ signal }) => http.get<IngresoMensual[]>('/reportes/ingresos-diarios', params, signal),
    enabled: options?.enabled ?? true,
    staleTime: CachePolicy.standard,
  })
}
