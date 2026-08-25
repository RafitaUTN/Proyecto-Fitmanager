import { z } from 'zod'

/**
 * Contrato unico de paginacion para los listados del panel. Todos los modulos
 * aceptan `pagina` y `limite` por query string y responden con la misma forma,
 * para que el frontend reutilice un solo componente.
 */
export const paginacionSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
})

export type PaginacionDto = z.infer<typeof paginacionSchema>

export interface Paginado<T> {
  data: T[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

/** Envuelve una pagina ya consultada. Un listado vacio tiene una pagina, no cero. */
export function paginar<T>(data: T[], total: number, { pagina, limite }: PaginacionDto): Paginado<T> {
  return { data, total, pagina, limite, totalPaginas: Math.max(1, Math.ceil(total / limite)) }
}
