import { describe, it, expect } from 'vitest'
import { AppError } from './errors'

describe('AppError', () => {
  it('should create error with message, statusCode, and codigo', () => {
    const error = new AppError('Test error', 400, 'TEST_ERROR')
    expect(error.message).toBe('Test error')
    expect(error.statusCode).toBe(400)
    expect(error.codigo).toBe('TEST_ERROR')
    expect(error.name).toBe('AppError')
  })

  it('should support optional data', () => {
    const data = { foo: 'bar', count: 42 }
    const error = new AppError('With data', 409, 'WITH_DATA', data)
    expect(error.data).toEqual(data)
  })

  it('should be instanceof Error', () => {
    const error = new AppError('Instance test', 500, 'INSTANCE')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
  })
})
