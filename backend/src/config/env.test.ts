import { describe, expect, it } from 'vitest'
import { parseTrustProxy } from './env'

describe('parseTrustProxy', () => {
  it('usa 1 en producción por defecto', () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      expect(parseTrustProxy(undefined)).toBe(1)
    } finally {
      process.env.NODE_ENV = original
    }
  })

  it('usa false en desarrollo por defecto', () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    try {
      expect(parseTrustProxy(undefined)).toBe(false)
    } finally {
      process.env.NODE_ENV = original
    }
  })

  it('desactiva trust proxy con false o 0', () => {
    expect(parseTrustProxy('false')).toBe(false)
    expect(parseTrustProxy('0')).toBe(false)
  })

  it('activa trust proxy con true', () => {
    expect(parseTrustProxy('true')).toBe(1)
  })

  it('interpreta saltos numéricos', () => {
    expect(parseTrustProxy('2')).toBe(2)
    expect(parseTrustProxy('1')).toBe(1)
  })

  it('rechaza valores inválidos con false', () => {
    expect(parseTrustProxy('abc')).toBe(false)
    expect(parseTrustProxy('')).toBe(false)
  })
})
