import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import type { ReactNode } from 'react'
import { hasRole } from '@/lib/authz'

export function RoleGuard({ roles, children, fallback }: { roles: string[]; children: ReactNode; fallback?: ReactNode }) {
  const usuario = useAuthStore((s) => s.usuario)
  if (!usuario || !hasRole(usuario.rol, roles)) {
    if (fallback) return <>{fallback}</>
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
