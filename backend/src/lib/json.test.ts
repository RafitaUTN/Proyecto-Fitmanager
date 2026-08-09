import { describe, expect, it } from 'vitest'
import { serializeBigInt } from './json'

describe('serializeBigInt', () => {
  it('preserva el contrato numérico para ids seguros', () => {
    expect(serializeBigInt(42n)).toBe(42)
  })

  it('usa string cuando Number perdería precisión', () => {
    expect(serializeBigInt(9_007_199_254_740_993n)).toBe('9007199254740993')
    expect(serializeBigInt(-9_007_199_254_740_993n)).toBe('-9007199254740993')
  })
})
