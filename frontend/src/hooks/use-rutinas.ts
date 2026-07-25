import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'

export interface RutinaResumen {
  id_rutina: number
  nombre: string
  descripcion: string | null
  fecha_creacion: string
  estado: boolean
  _count: { cliente_rutinas: number; rutina_ejercicios: number }
  entrenador: { id_usuario: number; nombre: string; apellido: string }
}

export interface RutinaDetalle {
  id_rutina: number
  nombre: string
  descripcion: string | null
  fecha_creacion: string
  estado: boolean
  entrenador: { id_usuario: number; nombre: string; apellido: string }
  rutina_ejercicios: Array<{
    id_rutina: number
    id_ejercicio: number
    series: number
    repeticiones: number
    peso_sugerido: number | null
    ejercicio: { id_ejercicio: number; nombre: string; grupo_muscular: string; descripcion: string | null }
  }>
}

export function useRutinas() {
  return useQuery({
    queryKey: QueryKeys.rutinas(),
    queryFn: () => http.get<RutinaResumen[]>('/rutinas'),
    staleTime: 1000 * 60 * 2,
  })
}

export function useRutina(id: number | undefined) {
  return useQuery({
    queryKey: QueryKeys.rutina(id!),
    queryFn: () => http.get<RutinaDetalle>(`/rutinas/${id}`),
    enabled: !!id,
  })
}

export function useCrearRutina(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: { nombre: string; descripcion?: string; ejercicios: Array<{ id_ejercicio: number; series: number; repeticiones: number; peso_sugerido?: number }> }) =>
      http.post('/rutinas', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.rutinas() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardEntrenador() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardAdmin() })
      emit(DomainEvents.RUTINA_CREADA)
      addToast('Rutina creada exitosamente', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useActualizarRutina(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { nombre?: string; descripcion?: string; ejercicios?: Array<{ id_ejercicio: number; series: number; repeticiones: number; peso_sugerido?: number }> } }) =>
      http.put(`/rutinas/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.rutinas() })
      emit(DomainEvents.RUTINA_EDITADA)
      addToast('Rutina actualizada', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useDuplicarRutina(onSuccess?: (id: number) => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id: number) => http.post(`/rutinas/${id}/duplicar`),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: QueryKeys.rutinas() })
      emit(DomainEvents.RUTINA_CREADA)
      addToast('Rutina duplicada', 'success')
      onSuccess?.(data.id_rutina)
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useEliminarRutina() {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id: number) => http.del(`/rutinas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.rutinas() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardEntrenador() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardAdmin() })
      emit(DomainEvents.RUTINA_ELIMINADA)
      addToast('Rutina eliminada', 'success')
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useAsignarRutina(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ idRutina, id_cliente, fecha_asignacion }: { idRutina: number; id_cliente: number; fecha_asignacion?: string }) =>
      http.post(`/rutinas/${idRutina}/asignar`, { id_cliente, fecha_asignacion }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.rutinas() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardEntrenador() })
      qc.invalidateQueries({ queryKey: QueryKeys.dashboardAdmin() })
      emit(DomainEvents.RUTINA_ASIGNADA)
      addToast('Rutina asignada exitosamente', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useAsignacionesRutina(id: number | undefined) {
  return useQuery({
    queryKey: QueryKeys.asignacionesRutina(id!),
    queryFn: () => http.get(`/rutinas/${id}/asignaciones`),
    enabled: !!id,
  })
}
