import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast-context'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'

export interface ClientePago {
  id_cliente: number; nombre: string; apellido: string; cedula: string
}

export interface MembresiaCliente {
  id_cliente_membresia: number
  id_cliente: number
  fecha_inicio: string
  fecha_fin: string
  estado: string
  membresia: { nombre: string; precio: number }
}

export interface Pago {
  id_pago: number
  monto: number
  metodo_pago: string
  fecha_pago: string
  estado: string
  saldo_pendiente: number
  estado_obligacion: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO'
  cliente: { nombre: string; apellido: string; cedula: string }
  cliente_membresia: { membresia: { nombre: string } }
}

export interface ResumenPago {
  id_cliente_membresia: number
  id_cliente: number
  membresia: string
  cliente: string
  monto_total: number
  monto_pagado: number
  saldo_pendiente: number
  estado_pago: 'PENDIENTE' | 'PARCIAL' | 'COMPLETADO' | 'VENCIDO'
  fecha_pago_habilitada: string
  fecha_vencimiento_pago: string
  pago_habilitado: boolean
  motivo_no_pagable: 'MEMBRESIA_INACTIVA' | 'MEMBRESIA_FUTURA' | 'VENTANA_NO_ABIERTA' | 'SALDO_COMPLETADO' | null
}

export function useClientesPago() {
  return useQuery({
    queryKey: QueryKeys.clientesPago(),
    queryFn: () => http.get<ClientePago[]>('/clientes'),
  })
}

export function usePagos(filtro?: { idCliente?: number; fechaInicio?: string; fechaFin?: string }) {
  const params = new URLSearchParams()
  if (filtro?.idCliente) params.set('id_cliente', String(filtro.idCliente))
  if (filtro?.fechaInicio) params.set('fecha_inicio', filtro.fechaInicio)
  if (filtro?.fechaFin) params.set('fecha_fin', filtro.fechaFin)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return useQuery({
    queryKey: QueryKeys.pagos(filtro),
    queryFn: () => http.get<Pago[]>(`/pagos${qs}`),
    staleTime: filtro?.idCliente ? 0 : 1000 * 60,
  })
}

export function useAsignacionesCliente(idCliente: number | undefined) {
  return useQuery({
    queryKey: QueryKeys.asignaciones(idCliente),
    queryFn: () => http.get<MembresiaCliente[]>(`/clientes-membresias?id_cliente=${idCliente}`),
    enabled: !!idCliente,
  })
}

export function useResumenPago(idClienteMembresia: number | undefined) {
  return useQuery({
    queryKey: ['pagos', 'resumen', idClienteMembresia],
    queryFn: () => http.get<ResumenPago>(`/pagos/resumen/${idClienteMembresia}`),
    enabled: Boolean(idClienteMembresia),
  })
}

export function useCrearPago(onSuccess?: () => void) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      id_cliente: number; id_cliente_membresia: number
      monto: number; metodo_pago: string
    }) => http.post('/pagos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] })
      queryClient.invalidateQueries({ queryKey: ['cliente', 'membresia'] })
      emit(DomainEvents.PAGO_REALIZADO)
      addToast('Pago registrado exitosamente', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
