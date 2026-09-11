/**
 * Hooks TanStack Query para sesiones programadas de rutinas.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { QueryKeys } from '@/lib/query-keys'
import { useToast } from '@/lib/toast-context'

export interface ProgramacionRutina {
  id_programacion: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA'
  capacidad: number | null
  notas: string | null
  rutina: { id_rutina: number; nombre: string; duracion_minutos: number | null; dificultad: string | null }
  entrenador: { id_usuario: number; nombre: string; apellido: string }
  clientes: Array<{ cliente: { id_cliente: number; nombre: string; apellido: string; nivel: string }; completada: boolean }>
  niveles: Array<{ nivel: string }>
}

export interface ProgramacionesResponse {
  data: ProgramacionRutina[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ProgramacionInput = {
  id_rutina: number
  id_entrenador: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  niveles: string[]
  clientes: number[]
  capacidad?: number
  notas?: string
}

export function useProgramacionesRutinas(filtros: {
  desde: string
  hasta: string
  id_entrenador?: string
  estado?: string
  nivel?: string
}) {
  return useQuery({
    queryKey: QueryKeys.programacionesRutina(filtros),
    queryFn: ({ signal }) => http.get<ProgramacionesResponse>('/programaciones-rutinas', filtros, signal),
  })
}

export function useCrearProgramacionRutina() {
  const qc = useQueryClient()
  const { addToast } = useToast()
  return useMutation({
    mutationFn: (data: ProgramacionInput) => http.post('/programaciones-rutinas', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programaciones-rutinas'] })
      addToast('Sesión programada creada', 'success')
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useCancelarProgramacionRutina() {
  const qc = useQueryClient()
  const { addToast } = useToast()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) =>
      http.post(`/programaciones-rutinas/${id}/cancelar`, { motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programaciones-rutinas'] })
      addToast('Sesión cancelada', 'success')
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}
