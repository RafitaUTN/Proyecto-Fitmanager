/**
 * Caché TTL en memoria para respuestas read-only de muy corta duración.
 *
 * @remarks En Vercel cada instancia mantiene su propia memoria; por eso esta
 * caché se usa solo para datos no críticos y de baja volatilidad. Su objetivo
 * es amortiguar ráfagas de lectura sin alterar la fuente de verdad en Postgres.
 */
type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>()

  constructor(private readonly maxEntries = 500) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs: number): T {
    if (ttlMs <= 0) return value
    this.evictIfNeeded()
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  }

  delete(key: string): void {
    this.entries.delete(key)
  }

  deletePrefix(prefix: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key)
    }
  }

  clear(): void {
    this.entries.clear()
  }

  private evictIfNeeded(): void {
    if (this.entries.size < this.maxEntries) return
    const now = Date.now()
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now || this.entries.size >= this.maxEntries) {
        this.entries.delete(key)
      }
      if (this.entries.size < this.maxEntries) return
    }
  }
}

export async function cached<T>(cache: TtlCache<T>, key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const value = await factory()
  return cache.set(key, value, ttlMs)
}
