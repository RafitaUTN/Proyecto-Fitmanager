import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './auth.store'

const usuario = { id_usuario: 1, id_gimnasio: 2, nombre: 'Ada', apellido: 'Lovelace', correo: 'ada@test.invalid', rol: 'Administrador' }

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

beforeEach(() => {
  useAuthStore.setState({ token: null, refreshToken: null, usuario: null, cliente: null, inicializado: false })
})

describe('auth store', () => {
  it('persiste login staff y separa identidad de cliente', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ token: 'access', refreshToken: 'refresh', usuario })))
    await useAuthStore.getState().login(usuario.correo, 'secret')
    expect(useAuthStore.getState()).toMatchObject({ token: 'access', refreshToken: 'refresh', usuario, cliente: null })
    expect(localStorage.getItem('refreshToken')).toBe('refresh')
  })

  it('envía el refresh al logout y limpia incluso si el servidor falla', async () => {
    useAuthStore.setState({ token: 'access', refreshToken: 'refresh', usuario, inicializado: true })
    localStorage.setItem('token', 'access')
    vi.stubGlobal('fetch', vi.fn(() => response({ error: 'fallo' }, 500)))
    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined()
    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toContain('refresh')
  })

  it('rota access y refresh en una renovación exitosa', async () => {
    useAuthStore.setState({ token: 'old-access', refreshToken: 'old-refresh' })
    vi.stubGlobal('fetch', vi.fn(() => response({ token: 'new-access', refreshToken: 'new-refresh' })))
    await expect(useAuthStore.getState().refresh()).resolves.toBe(true)
    expect(useAuthStore.getState()).toMatchObject({ token: 'new-access', refreshToken: 'new-refresh' })
  })

  it('persiste login de cliente sin mezclar datos staff', async () => {
    const cliente = { id_cliente: 8, nombre: 'Lin', apellido: 'Chen', correo: 'lin@test.invalid' }
    vi.stubGlobal('fetch', vi.fn(() => response({ token: 'client-access', refreshToken: 'client-refresh', cliente })))
    await useAuthStore.getState().loginCliente(cliente.correo, 'secret')
    expect(useAuthStore.getState()).toMatchObject({ cliente, usuario: null, token: 'client-access' })
    expect(localStorage.getItem('usuario')).toBeNull()
  })

  it('inicializa en anónimo sin almacenamiento y setAuth reemplaza identidades', async () => {
    await useAuthStore.getState().iniciar()
    expect(useAuthStore.getState()).toMatchObject({ inicializado: true, token: null })
    useAuthStore.getState().setAuth('manual', null, usuario)
    expect(useAuthStore.getState()).toMatchObject({ token: 'manual', usuario, cliente: null })
  })

  it('devuelve false al renovar sin refresh o ante rechazo del servidor', async () => {
    await expect(useAuthStore.getState().refresh()).resolves.toBe(false)
    useAuthStore.setState({ token: 'old', refreshToken: 'bad', usuario })
    vi.stubGlobal('fetch', vi.fn(() => response({ error: 'rechazado' }, 401)))
    await expect(useAuthStore.getState().refresh()).resolves.toBe(false)
    expect(useAuthStore.getState().token).toBeNull()
  })
})
