import type { ReactNode } from 'react'

export function PermissionGuard({ children, permission }: { children: ReactNode; permission: () => boolean }) {
  if (!permission()) return null
  return <>{children}</>
}