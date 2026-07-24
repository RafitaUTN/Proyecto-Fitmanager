export const DomainEvents = {
  CLIENTE_CREADO: 'cliente:creado',
  CLIENTE_ACTUALIZADO: 'cliente:actualizado',
  CLIENTE_ELIMINADO: 'cliente:eliminado',
  ENTRENADOR_ASIGNADO: 'entrenador:asignado',
  MEMBRESIA_ASIGNADA: 'membresia:asignada',
  MEMBRESIA_RENOVADA: 'membresia:renovada',
  MEMBRESIA_CANCELADA: 'membresia:cancelada',
  PAGO_REALIZADO: 'pago:realizado',
  TRANSFERENCIA_SOLICITADA: 'transferencia:solicitada',
  TRANSFERENCIA_APROBADA: 'transferencia:aprobada',
  TRANSFERENCIA_RECHAZADA: 'transferencia:rechazada',
  TRANSFERENCIA_CANCELADA: 'transferencia:cancelada',
  NOTIFICACION_LEIDA: 'notificacion:leida',
} as const

export type DomainEvent = (typeof DomainEvents)[keyof typeof DomainEvents]
export type EventPayload = Record<string, unknown>
type EventHandler = (payload: EventPayload) => void

const listeners = new Map<DomainEvent, Set<EventHandler>>()

export function on(event: DomainEvent, handler: EventHandler) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(handler)
  return () => listeners.get(event)!.delete(handler)
}

export function emit(event: DomainEvent, payload: EventPayload = {}) {
  listeners.get(event)?.forEach((h) => h(payload))
}
