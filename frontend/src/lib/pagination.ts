/**
 * Utilidad frontend pagination.
 *
 * @remarks Centraliza lógica compartida por páginas, hooks o componentes del cliente web.
 */
import type { PaginationMeta } from '@/components/ui/Pagination'

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

export function normalizePaginatedResponse<T>(response: T[] | PaginatedResponse<T>) {
  return Array.isArray(response) ? { data: response, pagination: undefined } : response
}
