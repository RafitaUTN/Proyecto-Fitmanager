import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadReport } from './download'
import { useAuthStore } from '@/store/auth.store'

type RefreshFn = () => Promise<boolean>

const response = (body: Blob | null, status = 200) => ({
  status,
  ok: status >= 200 && status < 300,
  blob: vi.fn(async () => body ?? new Blob()),
}) as unknown as Response

describe('descarga de reportes con refresh', () => {
  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    useAuthStore.setState({
      token: 'access-viejo',
      usuario: { id_usuario: 1, id_gimnasio: 1, nombre_gimnasio: 'Gym Test', nombre: 'A', apellido: 'B', correo: 'a@b.c', rol: 'Administrador' },
      refresh: vi.fn(async () => true) as unknown as RefreshFn,
    })
    vi.stubGlobal('fetch', vi.fn(async () => response(new Blob(['csv']))))
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    useAuthStore.setState({ token: null, usuario: null })
  })

  it('adjunta bearer y dispara la descarga en éxito', async () => {
    const ok = await downloadReport('ingresos-mensuales', '2026-01-01', '2026-01-31', 'csv')
    expect(ok).toBe(true)
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/reportes/exportar?tipo=ingresos-mensuales')
    expect(url).toContain('nombre_gimnasio=Gym%20Test')
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer access-viejo')
    expect(init.credentials).toBe('include')
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('refresca el token ante 401 y reintenta una sola vez con el nuevo', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const auth = (init?.headers as Headers)?.get('Authorization')
      if (auth === 'Bearer access-viejo') return response(null, 401)
      if (auth === 'Bearer access-nuevo') return response(new Blob(['csv']))
      return response(null, 500)
    })
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({
      refresh: vi.fn(async () => {
        useAuthStore.setState({ token: 'access-nuevo' })
        return true
      }) as unknown as RefreshFn,
    })

    const ok = await downloadReport('asistencias')
    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const bearerNuevo = (fetchMock.mock.calls[1]?.[1]?.headers as Headers | undefined)?.get('Authorization')
    expect(bearerNuevo).toBe('Bearer access-nuevo')
  })

  it('no reintenta cuando el refresh falla y reporta error', async () => {
    const fetchMock = vi.fn(async () => response(null, 401))
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({ refresh: vi.fn(async () => false) as unknown as RefreshFn })

    const ok = await downloadReport('asistencias')
    expect(ok).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reporta error en respuestas no-OK sin descargar', async () => {
    const fetchMock = vi.fn(async () => response(null, 500))
    vi.stubGlobal('fetch', fetchMock)

    const ok = await downloadReport('asistencias')
    expect(ok).toBe(false)
    expect(useAuthStore.getState().refresh).not.toHaveBeenCalled()
  })
})
