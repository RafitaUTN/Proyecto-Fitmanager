import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from './http-client'
import { getCsrfToken, setCsrfToken } from './csrf'

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

afterEach(() => {
  vi.unstubAllGlobals()
  setCsrfToken(null)
})

describe('http-client heal CSRF', () => {
  it('re-sincroniza el token CSRF una vez y reintenta la petición', async () => {
    setCsrfToken('token-viejo')
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'Token CSRF inválido', codigo: 'CSRF_INVALIDO' }, 403))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'token-nuevo' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(http.post('/usuarios', { nombre: 'x' })).resolves.toEqual({ ok: true })

    expect(getCsrfToken()).toBe('token-nuevo')
    const retryInit = fetchMock.mock.calls[2][1]
    expect((retryInit?.headers as Record<string, string> | undefined)?.['X-CSRF-Token']).toBe('token-nuevo')
  })

  it('no reintenta indefinidamente ante un 403 CSRF persistente', async () => {
    setCsrfToken('token-viejo')
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValue(jsonResponse({ error: 'Token CSRF inválido', codigo: 'CSRF_INVALIDO' }, 403))
    vi.stubGlobal('fetch', fetchMock)

    const error = await http.post('/usuarios', { nombre: 'x' }).catch((cause) => cause)
    expect(error).toMatchObject({ status: 403, codigo: 'CSRF_INVALIDO' })
    expect(fetchMock).toHaveBeenCalledTimes(2) // original + 1 reintento (GET /auth/csrf re-sync)
  })

  it('no intenta el heal en métodos GET', async () => {
    setCsrfToken('token')
    const fetchMock = vi.fn(() => jsonResponse({ error: 'Token CSRF inválido', codigo: 'CSRF_INVALIDO' }, 403))
    vi.stubGlobal('fetch', fetchMock)

    const error = await http.get('/usuarios').catch((cause) => cause)
    expect(error).toMatchObject({ status: 403 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
