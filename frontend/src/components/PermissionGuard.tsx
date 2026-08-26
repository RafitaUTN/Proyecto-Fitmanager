/**
 * Componente funcional PermissionGuard de FitManager.
 *
 * @remarks Encapsula una pieza de UI con comportamiento reutilizable para las páginas del sistema.
 */
import type { ReactNode } from 'react'

export function PermissionGuard({ children, permission }: { children: ReactNode; permission: () => boolean }) {
  if (!permission()) return null
  return <>{children}</>
}
