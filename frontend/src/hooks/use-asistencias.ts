/**
 * Hook de datos use-asistencias.
 *
 * @remarks Encapsula consultas y mutaciones HTTP con TanStack Query para separar acceso API de la UI.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'
import { CachePolicy } from '@/lib/cache-policy'

export interface Asistencia {
  id_asistencia: number
  id_cliente: number
  fecha_hora_ingreso: string
  fecha_hora_salida: string | null
  origen?: 'STAFF' | 'CLIENTE' | 'AUTOMATICA'
  cliente: {
    id_cliente: number
    nombre: string
    apellido: string
    cedula: string
    telefono: string | null
  }
  rutina_programada?: {
    id_programacion: number
    nombre: string
    hora_inicio: string
    hora_fin: string
    estado: string
    entrenador: { id_usuario: number; nombre: string; apellido: string }
  } | null
}

export interface AsistenciasResponse {
  data: Asistencia[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export interface AsistenciaFiltros {
  id_cliente?: number
  fecha_inicio?: string
  fecha_fin?: string
  solo_dentro?: boolean
  pagina?: number
  limite?: number
}

export function useAsistencias(filtros?: AsistenciaFiltros) {
  const params = new URLSearchParams()
  if (filtros?.id_cliente) params.set('id_cliente', String(filtros.id_cliente))
  if (filtros?.fecha_inicio) params.set('fecha_inicio', filtros.fecha_inicio)
  if (filtros?.fecha_fin) params.set('fecha_fin', filtros.fecha_fin)
  if (filtros?.solo_dentro) params.set('solo_dentro', 'true')
  if (filtros?.pagina) params.set('pagina', String(filtros.pagina))
  if (filtros?.limite) params.set('limite', String(filtros.limite))

  const qs = params.toString()

  return useQuery({
    queryKey: QueryKeys.asistencias((filtros || {}) as unknown as Record<string, unknown>),
    queryFn: ({ signal }) => http.get<AsistenciasResponse>(`/asistencias${qs ? `?${qs}` : ''}`, undefined, signal),
    placeholderData: (prev) => prev,
    staleTime: CachePolicy.volatile,
  })
}

export function useAsistenciasHoy() {
  return useQuery({
    queryKey: QueryKeys.asistenciasHoy(),
    queryFn: ({ signal }) => http.get<Asistencia[]>('/asistencias/hoy', undefined, signal),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: CachePolicy.realtime,
  })
}

export function useAsistenciasActivas() {
  return useQuery({
    queryKey: ['asistencias', 'activas'],
    queryFn: ({ signal }) => http.get<Asistencia[]>('/asistencias/activos', undefined, signal),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: CachePolicy.realtime,
  })
}

export function useRegistrarEntrada(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: { id_cliente: number; metodo?: string }) => http.post('/asistencias/entrada', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.asistenciasHoy() })
      qc.invalidateQueries({ queryKey: ['asistencias', 'activas'] })
      qc.invalidateQueries({ queryKey: QueryKeys.asistencias() })
      qc.invalidateQueries({ queryKey: QueryKeys.asistenciasClientesElegibles() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardAdmin() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardRecepcion() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardEntrenador() })
      emit(DomainEvents.ASISTENCIA_ENTRADA)
      addToast('Entrada registrada', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useRegistrarSalida(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id_asistencia: number) => http.patch(`/asistencias/${id_asistencia}/salida`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.asistenciasHoy() })
      qc.invalidateQueries({ queryKey: ['asistencias', 'activas'] })
      qc.invalidateQueries({ queryKey: QueryKeys.asistencias() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardAdmin() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardRecepcion() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardEntrenador() })
      emit(DomainEvents.ASISTENCIA_SALIDA)
      addToast('Salida registrada', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useClientesAsistencia() {
  return useQuery<any[]>({
    queryKey: QueryKeys.clientesPago(),
    queryFn: ({ signal }) => http.get('/clientes', undefined, signal),
    staleTime: CachePolicy.standard,
  })
}

export function useClientesElegibles() {
  return useQuery<any[]>({
    queryKey: QueryKeys.asistenciasClientesElegibles(),
    queryFn: ({ signal }) => http.get('/asistencias/clientes-elegibles', undefined, signal),
    staleTime: CachePolicy.volatile,
  })
}
