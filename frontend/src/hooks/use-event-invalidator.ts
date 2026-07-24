import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { on, type DomainEvent } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'
import type { QueryKey } from '@tanstack/react-query'

const EVENT_TO_KEYS: Partial<Record<DomainEvent, QueryKey[]>> = {
  'cliente:creado': [
    QueryKeys.clientes(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
  ],
  'cliente:actualizado': [
    QueryKeys.clientes(),
  ],
  'cliente:eliminado': [
    QueryKeys.clientes(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
  ],
  'entrenador:asignado': [
    QueryKeys.clientes(),
    QueryKeys.notificaciones(),
    QueryKeys.notificacionesContar(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardEntrenador(),
  ],
  'membresia:asignada': [
    QueryKeys.asignaciones(),
    QueryKeys.notificaciones(),
    QueryKeys.notificacionesContar(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
  ],
  'membresia:renovada': [
    QueryKeys.asignaciones(),
    QueryKeys.pagos(),
  ],
  'membresia:cancelada': [
    QueryKeys.asignaciones(),
    QueryKeys.clientes(),
    QueryKeys.dashboardAdmin(),
    QueryKeys.dashboardRecepcion(),
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
