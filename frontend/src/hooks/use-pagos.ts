import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'

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
  cliente: { nombre: string; apellido: string; cedula: string }
  cliente_membresia: { membresia: { nombre: string } }
}

export function useClientesPago() {
  return useQuery({
    queryKey: ['clientes-pago'],
    queryFn: () => http.get<ClientePago[]>('/clientes'),
  })
}

export function usePagos() {
  return useQuery({
    queryKey: ['pagos'],
    queryFn: () => http.get<Pago[]>('/pagos'),
  })
}

export function useAsignacionesCliente(idCliente: number | undefined) {
  return useQuery({
    queryKey: ['asignaciones', idCliente],
    queryFn: () => http.get<MembresiaCliente[]>(`/clientes-membresias?id_cliente=${idCliente}`),
    enabled: !!idCliente,
  })
}

export function useCrearPago(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: (data: {
      id_cliente: number; id_cliente_membresia: number
      monto: number; metodo_pago: string
    }) => http.post('/pagos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] })
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] })
      addToast('Pago registrado exitosamente', 'success')
      onSuccess?.()
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
