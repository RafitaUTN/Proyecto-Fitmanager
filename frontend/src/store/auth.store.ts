import { create } from 'zustand'
import { apiPost } from '@/lib/api'
import { tokenValido } from '@/lib/jwt'

interface Usuario {
  id_usuario: number
  id_gimnasio: number
  nombre_gimnasio?: string
  nombre: string
  apellido: string
  correo: string
  rol: string
}

interface ClienteInfo {
  id_cliente: number
  nombre: string
  apellido: string
  correo: string
  contrasena_temporal: boolean
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  usuario: Usuario | null
  cliente: ClienteInfo | null
  inicializado: boolean
  login: (correo: string, password: string) => Promise<void>
  loginCliente: (correo: string, password: string) => Promise<void>
  setAuth: (token: string, refreshToken: string | null, usuario: Usuario) => void
  logout: () => void
  refresh: () => Promise<boolean>
  iniciar: () => Promise<void>
}

function limpiarCompletamente() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('usuario')
  localStorage.removeItem('cliente')
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  usuario: null,
  cliente: null,
  inicializado: false,

  async iniciar() {
    const storedToken = localStorage.getItem('token')
    const storedRefresh = localStorage.getItem('refreshToken')
    const storedUsuario = localStorage.getItem('usuario')
    const storedCliente = localStorage.getItem('cliente')

    if (!storedToken && !storedRefresh) {
      limpiarCompletamente()
      set({ token: null, refreshToken: null, usuario: null, cliente: null, inicializado: true })
      return
    }

    if (storedToken && tokenValido(storedToken)) {
      try {
        const usuario = storedUsuario ? JSON.parse(storedUsuario) : null
        const cliente = storedCliente ? JSON.parse(storedCliente) : null
        set({ token: storedToken, refreshToken: storedRefresh, usuario, cliente, inicializado: true })
        return
      } catch {
        limpiarCompletamente()
        set({ token: null, refreshToken: null, usuario: null, cliente: null, inicializado: true })
        return
      }
    }

    if (storedRefresh) {
      set({ token: storedToken, refreshToken: storedRefresh })
      const ok = await get().refresh()
      if (ok) {
        set({ inicializado: true })
        return
      }
    }

    limpiarCompletamente()
    set({ token: null, refreshToken: null, usuario: null, cliente: null, inicializado: true })
  },

  async login(correo, password) {
    const res = await apiPost<{ token: string; refreshToken: string; usuario: Usuario }>('/auth/login', { correo, password })
    localStorage.setItem('token', res.token)
    localStorage.setItem('refreshToken', res.refreshToken)
    localStorage.setItem('usuario', JSON.stringify(res.usuario))
    localStorage.removeItem('cliente')
    set({ token: res.token, refreshToken: res.refreshToken, usuario: res.usuario, cliente: null, inicializado: true })
  },

  async loginCliente(correo, password) {
    const res = await apiPost<{ token: string; refreshToken: string; cliente: ClienteInfo }>('/auth/login-cliente', { correo, password })
    localStorage.setItem('token', res.token)
    localStorage.setItem('refreshToken', res.refreshToken)
    localStorage.setItem('cliente', JSON.stringify(res.cliente))
    localStorage.removeItem('usuario')
    set({ token: res.token, refreshToken: res.refreshToken, cliente: res.cliente, usuario: null, inicializado: true })
  },

  setAuth(token: string, refreshToken: string | null, usuario: Usuario) {
    localStorage.setItem('token', token)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('usuario', JSON.stringify(usuario))
    localStorage.removeItem('cliente')
    set({ token, refreshToken, usuario, cliente: null })
  },

  async refresh() {
    const currentRefreshToken = get().refreshToken
    if (!currentRefreshToken) return false
    try {
      const res = await apiPost<{ token: string; refreshToken: string }>('/auth/refresh', {
        refreshToken: currentRefreshToken,
      })
      localStorage.setItem('token', res.token)
      localStorage.setItem('refreshToken', res.refreshToken)
      set({ token: res.token, refreshToken: res.refreshToken })
      return true
    } catch {
      get().logout()
      return false
    }
  },

  logout() {
    limpiarCompletamente()
    set({ token: null, refreshToken: null, usuario: null, cliente: null })
  },
}))
