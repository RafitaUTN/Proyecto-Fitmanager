/**
 * Servicio de negocio del módulo membership-status.
 *
 * @remarks Contiene reglas del dominio FitManager y coordina repositorios, transacciones y efectos secundarios.
 */
import { businessDateKey } from './payment-balance'

export type EffectiveMembershipStatus = 'CANCELADA' | 'FUTURA' | 'VENCIDA' | 'ACTIVA'

function storedDateKey(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function resolveMembershipStatus(
  input: {
    estado: string
    fecha_inicio: Date
    fecha_fin: Date
  },
  now = new Date(),
): EffectiveMembershipStatus {
  const estado = input.estado.toLowerCase()
  if (estado === 'cancelada' || estado === 'cancelado') return 'CANCELADA'
  const today = businessDateKey(now)
  if (today < storedDateKey(input.fecha_inicio)) return 'FUTURA'
  if (today > storedDateKey(input.fecha_fin)) return 'VENCIDA'
  return 'ACTIVA'
}
