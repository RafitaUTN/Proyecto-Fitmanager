import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { QueryKeys } from '@/lib/query-keys'

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

export function useIngresosMensuales(filters?: { fecha_inicio?: string; fecha_fin?: string }) {
  const params = filters?.fecha_inicio || filters?.fecha_fin ? { ...filters } as Record<string, string> : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.ingresosMensuales(), filters],
    queryFn: () => http.get<IngresoMensual[]>('/reportes/ingresos-mensuales', params),
  })
}

export function useNuevosClientes(filters?: { fecha_inicio?: string; fecha_fin?: string }) {
  const params = filters?.fecha_inicio || filters?.fecha_fin ? { ...filters } as Record<string, string> : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.nuevosClientes(), filters],
    queryFn: () => http.get<NuevoCliente[]>('/reportes/nuevos-clientes', params),
  })
}

export function useDistribucionMembresias() {
  return useQuery({
    queryKey: QueryKeys.reportes.distribucionMembresias(),
    queryFn: () => http.get<DistribucionMembresia[]>('/reportes/distribucion-membresias'),
  })
}

export function useMetodosPago(filters?: { fecha_inicio?: string; fecha_fin?: string; metodo_pago?: string }) {
  const params = filters?.fecha_inicio || filters?.fecha_fin || filters?.metodo_pago ? { ...filters } as Record<string, string> : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.metodosPago(), filters],
    queryFn: () => http.get<MetodoPago[]>('/reportes/metodos-pago', params),
  })
}

export function useClientesActivosInactivos() {
  return useQuery({
    queryKey: QueryKeys.reportes.clientesActivosInactivos(),
    queryFn: () => http.get<ClientesActivosInactivos>('/reportes/clientes-activos-inactivos'),
  })
}

export function useAsistenciasReporte(filters?: { fecha_inicio?: string; fecha_fin?: string }) {
  const params = filters?.fecha_inicio || filters?.fecha_fin ? { ...filters } as Record<string, string> : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.asistencias(), filters],
    queryFn: () => http.get<NuevoCliente[]>('/reportes/asistencias', params),
  })
}

export function useAsistenciasPorHora(filters?: { fecha_inicio?: string; fecha_fin?: string }) {
  const params = filters?.fecha_inicio || filters?.fecha_fin ? { ...filters } as Record<string, string> : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.asistenciasPorHora(), filters],
    queryFn: () => http.get<{ hora: number; cantidad: number }[]>('/reportes/asistencias-por-hora', params),
  })
}

export function useIngresosDiarios(filters?: { fecha_inicio?: string; fecha_fin?: string }) {
  const params = filters?.fecha_inicio || filters?.fecha_fin ? { ...filters } as Record<string, string> : undefined
  return useQuery({
    queryKey: [...QueryKeys.reportes.ingresosDiarios(), filters],
    queryFn: () => http.get<IngresoMensual[]>('/reportes/ingresos-diarios', params),
  })
}
