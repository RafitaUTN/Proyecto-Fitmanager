import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { on, type DomainEvent } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'
import type { QueryKey } from '@tanstack/react-query'

const EVENT_TO_KEYS: Partial<Record<DomainEvent, QueryKey[]>> = {
  'ejercicio:creado': [
    QueryKeys.ejercicios(),
  ],
  'ejercicio:editado': [
    QueryKeys.ejercicios(),
  ],
  'ejercicio:eliminado': [
    QueryKeys.ejercicios(),
  ],
  'rutina:creada': [
    QueryKeys.rutinas(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardEntrenador(),
  ],
  'rutina:editada': [
    QueryKeys.rutinas(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardEntrenador(),
  ],
  'rutina:eliminada': [
    QueryKeys.rutinas(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardEntrenador(),
  ],
  'rutina:asignada': [
    QueryKeys.rutinas(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardEntrenador(),
  ],
  'rutina:asignada_entrenador': [
    QueryKeys.rutinas(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardEntrenador(),
  ],
  'rutina:removida_entrenador': [
    QueryKeys.rutinas(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardEntrenador(),
  ],
  'asistencia:entrada': [
    QueryKeys.asistenciasHoy(),
    QueryKeys.asistencias(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
    QueryKeys.dashboardEntrenador(),
  ],
  'asistencia:salida': [
    QueryKeys.asistenciasHoy(),
    QueryKeys.asistencias(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
    QueryKeys.dashboardEntrenador(),
  ],
  'cliente:creado': [
    QueryKeys.clientes(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
    QueryKeys.dashboardEntrenador(),
    ['entrenadores', 'disponibles'],
  ],
  'cliente:actualizado': [
    QueryKeys.clientes(),
    QueryKeys.dashboardEntrenador(),
    ['entrenadores', 'disponibles'],
  ],
  'cliente:eliminado': [
    QueryKeys.clientes(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
    QueryKeys.dashboardEntrenador(),
    ['entrenadores', 'disponibles'],
  ],
  'membresia:asignada': [
    QueryKeys.asignaciones(),
    QueryKeys.notificaciones(),
    QueryKeys.notificacionesContar(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
    QueryKeys.dashboardEntrenador(),
    ['entrenadores', 'disponibles'],
  ],
  'membresia:renovada': [
    QueryKeys.asignaciones(),
    QueryKeys.pagos(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
    QueryKeys.dashboardEntrenador(),
    ['entrenadores', 'disponibles'],
  ],
  'membresia:cancelada': [
    QueryKeys.asignaciones(),
    QueryKeys.clientes(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
    QueryKeys.dashboardEntrenador(),
    ['entrenadores', 'disponibles'],
  ],
  'pago:realizado': [
    QueryKeys.pagos(),
    QueryKeys.asignaciones(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
  ],
  'transferencia:solicitada': [
    QueryKeys.transferencias(),
    QueryKeys.transferenciasIndicadores(),
    QueryKeys.notificaciones(),
    QueryKeys.notificacionesContar(),
    QueryKeys.dashboardAdmin(),
  ],
  'transferencia:aprobada': [
    QueryKeys.transferencias(),
    QueryKeys.transferenciasIndicadores(),
    QueryKeys.notificaciones(),
    QueryKeys.notificacionesContar(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
  ],
  'transferencia:rechazada': [
    QueryKeys.transferencias(),
    QueryKeys.transferenciasIndicadores(),
    QueryKeys.notificaciones(),
    QueryKeys.notificacionesContar(),
    QueryKeys.dashboardAdmin(),
  ],
  'transferencia:cancelada': [
    QueryKeys.transferencias(),
    QueryKeys.transferenciasIndicadores(),
    QueryKeys.notificaciones(),
    QueryKeys.notificacionesContar(),
    QueryKeys.dashboardAdmin(),
  ],
  'notificacion:leida': [
    QueryKeys.notificaciones(),
    QueryKeys.notificacionesContar(),
  ],
  'cliente_rutina:ejercicio_actualizado': [
    QueryKeys.rutinas(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardEntrenador(),
  ],
  'cliente_rutina:actualizada': [
    QueryKeys.rutinas(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardEntrenador(),
  ],
}

export function useEventInvalidator() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubs = (Object.entries(EVENT_TO_KEYS) as [DomainEvent, QueryKey[]][]).map(
      ([event, keys]) =>
        on(event, () => {
          keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
        })
    )
    return () => unsubs.forEach((fn) => fn())
  }, [queryClient])
}
