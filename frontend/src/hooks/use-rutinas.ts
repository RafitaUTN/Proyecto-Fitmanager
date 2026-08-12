import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'

export interface RutinaResumen {
  id_rutina: number
  nombre: string
  descripcion: string | null
  objetivo: string | null
  duracion_minutos: number | null
  dificultad: string | null
  fecha_creacion: string
  estado: boolean
  _count: { cliente_rutinas: number; rutina_ejercicios: number; entrenadores: number }
  creador: { id_usuario: number; nombre: string; apellido: string }
  entrenadores: Array<{
    id_rutina: number
    id_entrenador: number
    entrenador: { id_usuario: number; nombre: string; apellido: string }
  }>
  rutina_ejercicios: Array<{ ejercicio: { id_ejercicio: number; nombre: string; imagen_url: string | null; animacion_url: string | null; tipo_media: string | null } }>
}

export interface RutinaDetalle {
  id_rutina: number
  nombre: string
  descripcion: string | null
  objetivo: string | null
  duracion_minutos: number | null
  dificultad: string | null
  fecha_creacion: string
  estado: boolean
  creador: { id_usuario: number; nombre: string; apellido: string }
  entrenadores: Array<{
    id_rutina: number
    id_entrenador: number
    entrenador: { id_usuario: number; nombre: string; apellido: string }
  }>
  rutina_ejercicios: Array<{
    id_rutina: number
    id_ejercicio: number
    series: number
    repeticiones: number
    peso_sugerido: number | null
    descanso: number | null
    notas: string | null
    orden: number
    ejercicio: { id_ejercicio: number; nombre: string; grupo_muscular: string; descripcion: string | null; imagen_url: string | null; animacion_url: string | null; tipo_media: string | null }
  }>
}

export function useRutinas() {
  return useQuery({
    queryKey: QueryKeys.rutinas(),
    queryFn: () => http.get<RutinaResumen[]>('/rutinas'),
    staleTime: 1000 * 5,
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
    mutationFn: (data: { nombre: string; descripcion?: string; objetivo?: string; duracion_minutos?: number; dificultad?: string; ejercicios: Array<{ id_ejercicio: number; series: number; repeticiones: number; peso_sugerido?: number; descanso?: number; notas?: string; orden?: number }> }) =>
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
    mutationFn: ({ id, data }: { id: number; data: { nombre?: string; descripcion?: string; objetivo?: string; duracion_minutos?: number; dificultad?: string; estado?: boolean; ejercicios?: Array<{ id_ejercicio: number; series: number; repeticiones: number; peso_sugerido?: number; descanso?: number; notas?: string; orden?: number }> } }) =>
      http.put(`/rutinas/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QueryKeys.rutinas() })
      qc.invalidateQueries({ queryKey: QueryKeys.rutina(vars.id) })
      emit(DomainEvents.RUTINA_EDITADA)
      addToast('Rutina actualizada', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useEliminarRutina() {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id: number) => http.del(`/rutinas/${id}`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: QueryKeys.rutinas() })
      qc.invalidateQueries({ queryKey: QueryKeys.rutina(id) })
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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QueryKeys.rutinas() })
      qc.invalidateQueries({ queryKey: QueryKeys.rutina(vars.idRutina) })
      qc.invalidateQueries({ queryKey: QueryKeys.asignacionesRutina(vars.idRutina) })
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
  return useQuery<any[]>({
    queryKey: QueryKeys.asignacionesRutina(id!),
    queryFn: () => http.get(`/rutinas/${id}/asignaciones`),
    enabled: !!id,
  })
}

// Client routine snapshot hooks
export function useClienteRutina(idClienteRutina: number | undefined) {
  return useQuery({
    queryKey: ['cliente-rutina', idClienteRutina],
    queryFn: () => http.get<{ cliente: { nombre: string; apellido: string }; rutina: { nombre: string }; ejercicios: Array<{ id_cliente_rutina_ejercicio: number; nombre: string; grupo_muscular: string; series: number; repeticiones: number; peso: number | null; descanso: number | null }>; observaciones: string | null }>(`/rutinas/cliente-rutina/${idClienteRutina}`),
    enabled: !!idClienteRutina,
  })
}

export function useRutinasDeCliente(idCliente: number | undefined) {
  return useQuery({
    queryKey: ['cliente-rutinas', idCliente],
    queryFn: () => http.get(`/rutinas/cliente/${idCliente}/rutinas`),
    enabled: !!idCliente,
  })
}

export function useActualizarEjercicioCliente(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()
  return useMutation({
    mutationFn: ({ idClienteRutina, idEjercicio, data }: { idClienteRutina: number; idEjercicio: number; data: any }) =>
      http.put(`/rutinas/cliente-rutina/${idClienteRutina}/ejercicios/${idEjercicio}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cliente-rutina'] })
      emit(DomainEvents.CLIENTE_RUTINA_EJERCICIO_ACTUALIZADO)
      addToast('Ejercicio actualizado', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useActualizarClienteRutina(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      http.put(`/rutinas/cliente-rutina/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cliente-rutina'] })
      emit(DomainEvents.CLIENTE_RUTINA_ACTUALIZADA)
      addToast('Rutina del cliente actualizada', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}
