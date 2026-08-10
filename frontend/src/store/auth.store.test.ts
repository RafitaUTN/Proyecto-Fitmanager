import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCsrfToken, setCsrfToken } from '@/lib/csrf'
import { useAuthStore } from './auth.store'

const usuario = { id_usuario: 1, id_gimnasio: 2, nombre: 'Ada', apellido: 'Lovelace', correo: 'ada@test.invalid', rol: 'Administrador' }

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

beforeEach(() => {
  localStorage.clear()
  setCsrfToken(null)
  useAuthStore.setState({ token: null, usuario: null, cliente: null, actorType: null, role: null, inicializado: false })
})

describe('auth store', () => {
  it('mantiene access e identidad solo en memoria al iniciar sesiÃ³n', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ token: 'access', csrfToken: 'csrf-login', actorType: 'STAFF', role: 'Administrador', usuario })))
    await useAuthStore.getState().login(usuario.correo, 'secret')
    expect(useAuthStore.getState()).toMatchObject({ token: 'access', usuario, cliente: null })
    expect(getCsrfToken()).toBe('csrf-login')
    expect(localStorage.length).toBe(0)
    expect(vi.mocked(fetch).mock.calls[0][1]?.credentials).toBe('include')
  })

  it('revoca mediante cookie y CSRF y limpia memoria aunque el servidor falle', async () => {
    useAuthStore.setState({ token: 'access', usuario, inicializado: true })
    setCsrfToken('csrf-logout')
    vi.stubGlobal('fetch', vi.fn(() => response({ error: 'fallo' }, 500)))
    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined()
    expect(useAuthStore.getState().token).toBeNull()
    const init = vi.mocked(fetch).mock.calls[0][1]
    expect(init?.body).toBe('{}')
    const headers = init?.headers as Record<string, string> | undefined
    expect(headers?.['X-CSRF-Token']).toBe('csrf-logout')
  })

  it('rota la sesiÃ³n usando exclusivamente la cookie HttpOnly', async () => {
    setCsrfToken('csrf-old')
    vi.stubGlobal('fetch', vi.fn(() => response({ token: 'new-access', csrfToken: 'csrf-new', actorType: 'STAFF', role: 'Administrador', usuario })))
    await expect(useAuthStore.getState().refresh()).resolves.toBe(true)
    expect(useAuthStore.getState()).toMatchObject({ token: 'new-access', usuario })
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe('{}')
    expect(getCsrfToken()).toBe('csrf-new')
  })

  it('restaura una sesiÃ³n desde cookie sin leer almacenamiento local', async () => {
    localStorage.setItem('token', 'legacy')
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response({ csrfToken: 'csrf-bootstrap' }))
      .mockImplementationOnce(() => response({ token: 'restored', csrfToken: 'csrf-rotated', actorType: 'STAFF', role: 'Administrador', usuario }))
    vi.stubGlobal('fetch', fetchMock)
    await useAuthStore.getState().iniciar()
    expect(useAuthStore.getState()).toMatchObject({ token: 'restored', usuario, inicializado: true })
    expect(localStorage.length).toBe(0)
  })

  it('comparte una sola inicializaciÃ³n y rotaciÃ³n entre llamadas concurrentes', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => response({ csrfToken: 'csrf-bootstrap' }))
      .mockImplementationOnce(() => response({ token: 'restored', csrfToken: 'csrf-rotated', actorType: 'STAFF', role: 'Administrador', usuario }))
    vi.stubGlobal('fetch', fetchMock)
    await Promise.all([useAuthStore.getState().iniciar(), useAuthStore.getState().iniciar()])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(useAuthStore.getState()).toMatchObject({ token: 'restored', usuario, inicializado: true })
  })

  it('mantiene separada la identidad de cliente', async () => {
    const cliente = { id_cliente: 8, nombre: 'Lin', apellido: 'Chen', correo: 'lin@test.invalid' }
    vi.stubGlobal('fetch', vi.fn(() => response({ token: 'client-access', csrfToken: 'csrf-client', actorType: 'CLIENTE', role: 'Cliente', cliente })))
    await expect(useAuthStore.getState().login(cliente.correo, 'secret')).resolves.toBe('CLIENTE')
    expect(useAuthStore.getState()).toMatchObject({ cliente, usuario: null, token: 'client-access', actorType: 'CLIENTE', role: 'Cliente' })
    expect(localStorage.length).toBe(0)
  })

  it('queda anÃ³nimo cuando no existe sesiÃ³n renovable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ error: 'sin sesiÃ³n' }, 401)))
    await useAuthStore.getState().iniciar()
    expect(useAuthStore.getState()).toMatchObject({ inicializado: true, token: null, usuario: null, cliente: null })
  })

  it('acepta la sesiÃ³n creada durante el registro sin persistirla', () => {
    useAuthStore.getState().setAuth('manual', usuario, 'csrf-register')
    expect(useAuthStore.getState()).toMatchObject({ token: 'manual', usuario, cliente: null })
    expect(getCsrfToken()).toBe('csrf-register')
    expect(localStorage.length).toBe(0)
  })
})
