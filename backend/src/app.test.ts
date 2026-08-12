import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import app from './app'

let server: Server
let baseUrl: string

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (error?: Error) => (error ? reject(error) : resolve()))
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
})

describe('error contract and request correlation', () => {
  it('returns the same safe request id in the header and error body', async () => {
    const response = await fetch(`${baseUrl}/api/does-not-exist`, {
      headers: { 'x-request-id': 'audit-request-123' },
    })
    const body = await response.json() as Record<string, unknown>

    expect(response.status).toBe(404)
    expect(response.headers.get('x-request-id')).toBe('audit-request-123')
    expect(body).toMatchObject({
      error: 'Recurso no encontrado',
      codigo: 'NOT_FOUND',
      message: 'Recurso no encontrado',
      code: 'NOT_FOUND',
      requestId: 'audit-request-123',
    })
  })

  it('replaces an unsafe supplied request id', async () => {
    const response = await fetch(`${baseUrl}/api/does-not-exist`, {
      headers: { 'x-request-id': '<script>alert(1)</script>' },
    })
    const body = await response.json() as Record<string, unknown>
    const requestId = response.headers.get('x-request-id')

    expect(requestId).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.requestId).toBe(requestId)
  })
})
