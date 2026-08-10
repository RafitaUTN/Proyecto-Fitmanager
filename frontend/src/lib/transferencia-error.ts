import type { TransferRequestData } from '@/components/TransferRequestModal'

interface ErrorLike {
  status?: number
  body?: unknown
}

export function tryParseClienteActivoError(err: unknown): TransferRequestData | null {
  const e = err as ErrorLike | null
  if (e?.status !== 409) return null
  const body = e.body as { codigo?: string; data?: TransferRequestData } | null
  if (!body || typeof body !== 'object') return null
  if (body.codigo !== 'CLIENTE_ACTIVO_OTRO_GYM') return null
  return body.data ?? null
}
