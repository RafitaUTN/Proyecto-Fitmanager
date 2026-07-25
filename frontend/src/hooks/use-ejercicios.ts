import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'

export interface Ejercicio {
  id_ejercicio: number
  nombre: string
  grupo_muscular: string
  descripcion: string | null
  nivel: string
  categoria: string | null
  estado: boolean
  _count: { rutina_ejercicios: number }
}

export function useEjercicios(enabled?: boolean) {
  return useQuery({
    queryKey: QueryKeys.ejercicios(),
    queryFn: () => http.get<Ejercicio[]>('/ejercicios'),
    staleTime: 1000 * 60 * 5,
    enabled: enabled ?? true,
  })
}

export function useCrearEjercicio(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: { nombre: string; grupo_muscular: string; descripcion?: string }) =>
      http.post('/ejercicios', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.ejercicios() })
      emit(DomainEvents.EJERCICIO_CREADO)
      addToast('Ejercicio creado exitosamente', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useActualizarEjercicio(onSuccess?: () => void) {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { nombre?: string; grupo_muscular?: string; descripcion?: string; nivel?: string; categoria?: string; estado?: boolean } }) =>
      http.put(`/ejercicios/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.ejercicios() })
      emit(DomainEvents.EJERCICIO_EDITADO)
      addToast('Ejercicio actualizado', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}

export function useEliminarEjercicio() {
  const qc = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (id: number) => http.del(`/ejercicios/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.ejercicios() })
      emit(DomainEvents.EJERCICIO_ELIMINADO)
      addToast('Ejercicio eliminado', 'success')
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })
}
