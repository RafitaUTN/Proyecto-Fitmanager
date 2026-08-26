/**
 * Políticas de caché frontend por dominio de negocio.
 *
 * @remarks Evita usar un único `staleTime` para datos con ritmos de cambio distintos.
 */
export const CachePolicy = {
  realtime: 10_000,
  volatile: 30_000,
  standard: 60_000,
  catalog: 5 * 60_000,
  static: 15 * 60_000,
  externalMedia: 7 * 24 * 60 * 60_000,
} as const
