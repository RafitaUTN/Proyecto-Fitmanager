const BIGINT_REGEX = /^\d+$/

export function safeBigInt(value: unknown, name: string = 'id'): bigint {
  if (typeof value === 'bigint') return value
  const str = String(value)
  if (!BIGINT_REGEX.test(str)) {
    const err: any = new Error(`${name} inválido: debe ser un número entero positivo`)
    err.statusCode = 400
    throw err
  }
  try {
    return BigInt(str)
  } catch {
    const err: any = new Error(`${name} inválido: no se pudo convertir`)
    err.statusCode = 400
    throw err
  }
}

export function safeParseInt(value: unknown, name: string = 'id'): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  const str = String(value)
  if (!BIGINT_REGEX.test(str)) {
    const err: any = new Error(`${name} inválido: debe ser un número entero positivo`)
    err.statusCode = 400
    throw err
  }
  const num = parseInt(str, 10)
  if (isNaN(num) || !Number.isSafeInteger(num)) {
    const err: any = new Error(`${name} inválido: fuera de rango`)
    err.statusCode = 400
    throw err
  }
  return num
}
