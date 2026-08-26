/**
 * Componente funcional EventBridge de FitManager.
 *
 * @remarks Encapsula una pieza de UI con comportamiento reutilizable para las páginas del sistema.
 */
import { useEventInvalidator } from '@/hooks/use-event-invalidator'

export function EventBridge() {
  useEventInvalidator()
  return null
}
