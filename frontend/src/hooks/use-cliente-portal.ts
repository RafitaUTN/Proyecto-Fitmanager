/**
 * Hook de datos use-cliente-portal.
 *
 * @remarks Encapsula consultas y mutaciones HTTP con TanStack Query para separar acceso API de la UI.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'

interface ClientePerfil {
  id_cliente: number
  nombre: string
  apellido: string
  correo: string
  telefono: string | null
  cedula: string | null
  ultimo_acceso: string | null
  nombre_gimnasio: string
  entrenador: { nombre: string; apellido: string } | null
}

interface ClienteMembresia {
  id: number
  plan: { nombre: string; descripcion: string; duracion_dias: number; precio: number }
  fecha_inicio: string
  fecha_fin: string
  estado: string
  progreso: number
  dias_restantes: number
  pago: {
    monto_total: number
    monto_pagado: number
    saldo_pendiente: number
    estado_pago: 'PENDIENTE' | 'PARCIAL' | 'COMPLETADO' | 'VENCIDO'
    fecha_pago_habilitada: string
    fecha_vencimiento_pago: string
    pago_habilitado: boolean
    motivo_no_pagable: 'MEMBRESIA_INACTIVA' | 'MEMBRESIA_FUTURA' | 'VENTANA_NO_ABIERTA' | 'SALDO_COMPLETADO' | null
  }
  historial: Array<{ id: number; plan: string; fecha_inicio: string; fecha_fin: string; estado: string }>
}

interface ClienteRutina {
  id: number
  id_rutina: number
  nombre: string
  descripcion: string | null
  objetivo: string | null
  duracion_minutos: number | null
  dificultad: string | null
  fecha_asignacion: string
  estado: string
  ejercicios: Array<{
    id: number
    nombre: string
    descripcion: string | null
    grupo_muscular: string | null
    imagen_url: string | null
    animacion_url: string | null
    tipo_media: string | null
    series: number
    repeticiones: string
    peso: string | null
    descanso: number | null
    orden: number
    notas: string | null
  }>
}

export interface ClienteNotificacion {
  id_notificacion: number
  titulo: string
  mensaje: string
  tipo: 'MEMBRESIA' | 'TRANSFERENCIA' | 'SISTEMA'
  fecha_envio: string
  leida: boolean
  accion_url?: string | null
}

export interface ClienteRutinaProgramada {
  id_programacion: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA'
  capacidad: number | null
  notas: string | null
  rutina: {
    id_rutina: number
    nombre: string
    descripcion: string | null
    duracion_minutos: number | null
    dificultad: string | null
  }
  entrenador: { id_usuario: number; nombre: string; apellido: string }
  clientes: Array<{ id_cliente: number; completada: boolean; completada_en: string | null }>
  niveles: Array<{ nivel: 'PRINCIPIANTE' | 'INTERMEDIO' | 'AVANZADO' | 'EXPERTO' | 'TODOS' }>
}

export type ClienteAsistenciaActual = {
  id_asistencia: number
  fecha_hora_ingreso: string
  fecha_hora_salida: string | null
  origen: 'STAFF' | 'CLIENTE' | 'AUTOMATICA'
} | null

export function useClientePerfil() {
  return useQuery<ClientePerfil>({
    queryKey: ['cliente', 'perfil'],
    queryFn: ({ signal }) => http.get<ClientePerfil>('/cliente/me', undefined, signal),
  })
}

export function useClienteMembresia() {
  return useQuery<ClienteMembresia>({
    queryKey: ['cliente', 'membresia'],
    queryFn: ({ signal }) => http.get<ClienteMembresia>('/cliente/me/membresia', undefined, signal),
  })
}

export function useClienteRutinas() {
  return useQuery<ClienteRutina[]>({
    queryKey: ['cliente', 'rutinas'],
    queryFn: ({ signal }) => http.get<ClienteRutina[]>('/cliente/me/rutinas', undefined, signal),
  })
}

export function useClienteRutinasCalendario(desde: string, hasta: string) {
  return useQuery<ClienteRutinaProgramada[]>({
    queryKey: ['cliente', 'rutinas', 'calendario', desde, hasta],
    queryFn: ({ signal }) =>
      http.get<ClienteRutinaProgramada[]>('/cliente/me/rutinas/calendario', { desde, hasta }, signal),
  })
}

export function useCompletarRutinaProgramada() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => http.patch(`/cliente/me/rutinas/programadas/${id}/completar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', 'rutinas', 'calendario'] })
    },
  })
}

export function useClienteAsistenciaActual() {
  return useQuery<ClienteAsistenciaActual>({
    queryKey: ['cliente', 'asistencia', 'actual'],
    queryFn: ({ signal }) => http.get<ClienteAsistenciaActual>('/cliente/me/asistencia/actual', undefined, signal),
    refetchOnWindowFocus: true,
  })
}

export function useClienteRegistrarEntrada() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => http.post('/cliente/me/asistencia/entrada'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', 'asistencia', 'actual'] })
    },
  })
}

export function useClienteRegistrarSalida() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => http.post('/cliente/me/asistencia/salida'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', 'asistencia', 'actual'] })
    },
  })
}

export function useClienteNotificaciones() {
  return useQuery({
    queryKey: ['cliente', 'notificaciones'],
    queryFn: ({ signal }) => http.get<ClienteNotificacion[]>('/cliente/me/notificaciones', undefined, signal),
  })
}

export function useMarcarClienteNotificacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => http.put(`/cliente/me/notificaciones/${id}/leer`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cliente', 'notificaciones'] }),
  })
}

export function useCambiarPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { contrasena_actual: string; contrasena_nueva: string; confirmar_password: string }) =>
      http.put<{ mensaje: string }>('/cliente/me/contrasena', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', 'perfil'] })
    },
  })
}
