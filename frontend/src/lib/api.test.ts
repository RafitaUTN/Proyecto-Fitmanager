import { describe, expect, it, vi } from 'vitest'
import { apiGet, apiPost, apiPostAuthorized, ApiRequestError } from './api'

const response = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }))

describe('cliente API público', () => {
  it('envía POST JSON y devuelve el cuerpo', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ ok: true })))
    await expect(apiPost('/test', { value: 1 })).resolves.toEqual({ ok: true })
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe('POST')
  })

  it('incluye bearer en operaciones autorizadas', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ ok: true })))
    await apiPostAuthorized('/private', {}, 'access')
    const firstInit = vi.mocked(fetch).mock.calls[0][1]
    expect((firstInit?.headers as Record<string, string> | undefined)?.Authorization).toBe('Bearer access')
    await apiGet('/private', 'access')
    const secondInit = vi.mocked(fetch).mock.calls[1][1]
    expect((secondInit?.headers as Record<string, string> | undefined)?.Authorization).toBe('Bearer access')
  })

  it('normaliza errores HTTP con status y código de negocio', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ error: 'Denegado', codigo: 'NO' }, 403)))
    const error = await apiGet('/private').catch((cause) => cause)
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error).toMatchObject({ message: 'Denegado', status: 403, codigo: 'NO' })
  })
})
