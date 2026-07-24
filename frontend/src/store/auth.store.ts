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

interface AuthState {
  token: string | null
  refreshToken: string | null
  usuario: Usuario | null
  inicializado: boolean
  login: (correo: string, password: string) => Promise<void>
  setAuth: (token: string, refreshToken: string | null, usuario: Usuario) => void
  logout: () => void
  refresh: () => Promise<boolean>
  iniciar: () => Promise<void>
}

function limpiarCompletamente() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('usuario')
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  usuario: null,
  inicializado: false,

  async iniciar() {
    const storedToken = localStorage.getItem('token')
    const storedRefresh = localStorage.getItem('refreshToken')
    const storedUsuario = localStorage.getItem('usuario')

    // Sin tokens — estado limpio
    if (!storedToken && !storedRefresh) {
      limpiarCompletamente()
      set({ token: null, refreshToken: null, usuario: null, inicializado: true })
      return
    }

    // Token aún válido — restaurar sesión
    if (storedToken && tokenValido(storedToken)) {
      try {
        const usuario = JSON.parse(storedUsuario || 'null')
        set({ token: storedToken, refreshToken: storedRefresh, usuario, inicializado: true })
        return
      } catch {
        limpiarCompletamente()
        set({ token: null, refreshToken: null, usuario: null, inicializado: true })
        return
      }
    }

    // Token expirado o inválido — intentar refresh
    if (storedRefresh) {
      set({ token: storedToken, refreshToken: storedRefresh })
      const ok = await get().refresh()
      if (ok) {
        set({ inicializado: true })
        return
      }
    }

    // Refresh falló — limpiar todo
    limpiarCompletamente()
    set({ token: null, refreshToken: null, usuario: null, inicializado: true })
  },

  async login(correo, password) {
    const res = await apiPost<{ token: string; refreshToken: string; usuario: Usuario }>('/auth/login', { correo, password })
    localStorage.setItem('token', res.token)
    localStorage.setItem('refreshToken', res.refreshToken)
    localStorage.setItem('usuario', JSON.stringify(res.usuario))
    set({ token: res.token, refreshToken: res.refreshToken, usuario: res.usuario, inicializado: true })
  },

  setAuth(token: string, refreshToken: string | null, usuario: Usuario) {
    localStorage.setItem('token', token)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('usuario', JSON.stringify(usuario))
    set({ token, refreshToken, usuario })
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
    set({ token: null, refreshToken: null, usuario: null })
  },
}))
