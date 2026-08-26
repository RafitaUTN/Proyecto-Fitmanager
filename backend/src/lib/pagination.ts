/**
 * Utilidad compartida pagination para la API de FitManager.
 *
 * @remarks Evita duplicar lógica transversal usada por controladores, servicios o middlewares.
 */
import { z } from 'zod'

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export function hasPaginationQuery(query: Record<string, unknown>) {
  return query.page !== undefined || query.pageSize !== undefined
}

export function paginationMeta(page: number, pageSize: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

export function paginatedResponse<T>(data: T[], page: number, pageSize: number, totalItems: number) {
  return { data, pagination: paginationMeta(page, pageSize, totalItems) }
}
