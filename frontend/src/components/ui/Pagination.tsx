/**
 * Componente de interfaz reutilizable Pagination.
 *
 * @remarks Unifica estilos y comportamiento visual para mantener consistencia en las pantallas de FitManager.
 */
import { Button } from './Button'

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
}: {
  pagination?: PaginationMeta
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  if (!pagination) return null
  const start = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.totalItems)
  const pages = Array.from({ length: Math.min(5, pagination.totalPages) }, (_, index) => {
    const first = Math.max(1, Math.min(pagination.page - 2, Math.max(1, pagination.totalPages - 4)))
    return first + index
  }).filter((page) => page <= pagination.totalPages)

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-border px-3 py-3 text-sm sm:px-4">
      <p className="text-muted text-center md:text-left">
        Mostrando {start}-{end} de {pagination.totalItems} registros
      </p>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:flex-wrap">
        <select
          value={pagination.pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="col-span-3 rounded-input border border-border bg-surface text-foreground px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-1 sm:py-1.5"
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size} por página
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={!pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
          className="w-full sm:w-auto"
        >
          Anterior
        </Button>
        {pages.map((page) => (
          <Button
            key={page}
            size="sm"
            variant={page === pagination.page ? 'primary' : 'outline'}
            onClick={() => onPageChange(page)}
            className="w-full sm:w-auto"
          >
            {page}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={!pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
          className="w-full sm:w-auto"
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
