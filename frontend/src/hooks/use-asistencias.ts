import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'

export interface Asistencia {
  id_asistencia: number
  id_cliente: number
  fecha_hora_ingreso: string
  fecha_hora_salida: string | null
  cliente: {
    id_cliente: number
    nombre: string
    apellido: string
    cedula: string
    telefono: string | null
  }
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
    queryFn: () => http.get<AsistenciasResponse>(`/asistencias${qs ? `?${qs}` : ''}`),
  })
}

export function useAsistenciasHoy() {
  return useQuery({
    queryKey: QueryKeys.asistenciasHoy(),
    queryFn: () => http.get<Asistencia[]>('/asistencias/hoy'),
    refetchInterval: 30000,
  })
}

export function useAsistenciasActivas() {
  return useQuery({
    queryKey: ['asistencias', 'activas'],
    queryFn: () => http.get<Asistencia[]>('/asistencias/activos'),
    refetchInterval: 30000,
  })
}

export function useRegistrarEntrada(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: { id_cliente: number; metodo?: string }) =>
      http.post('/asistencias/entrada', data),
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
    mutationFn: (id_asistencia: number) =>
      http.patch(`/asistencias/${id_asistencia}/salida`),
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
    queryFn: () => http.get('/clientes'),
  })
}

export function useClientesElegibles() {
  return useQuery<any[]>({
    queryKey: QueryKeys.asistenciasClientesElegibles(),
    queryFn: () => http.get('/asistencias/clientes-elegibles'),
  })
}
