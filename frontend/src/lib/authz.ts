import type { StaffRole } from '@/store/auth.store'

export const PERMISSIONS = {
  MANAGE_USERS: ['Administrador'],
  MANAGE_CLIENTS: ['Administrador', 'Recepcionista'],
  MANAGE_PAYMENTS: ['Administrador', 'Recepcionista'],
  MANAGE_ATTENDANCE: ['Administrador', 'Recepcionista'],
  MANAGE_ROUTINES: ['Administrador', 'Entrenador'],
  MANAGE_EXERCISES: ['Administrador', 'Entrenador'],
  VIEW_REPORTS: ['Administrador'],
} as const satisfies Record<string, readonly StaffRole[]>

export type Permission = keyof typeof PERMISSIONS

export function hasRole(role: string | null | undefined, roles: readonly string[]): boolean {
  return Boolean(role && roles.includes(role))
}

export function can(role: string | null | undefined, permission: Permission): boolean {
  return hasRole(role, PERMISSIONS[permission])
}
