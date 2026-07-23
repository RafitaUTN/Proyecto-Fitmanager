import { create } from 'zustand'
import { apiPost } from '@/lib/api'

interface Usuario {
  id_usuario: number
  nombre: string
  apellido: string
  correo: string
  rol: string
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  usuario: Usuario | null
  login: (correo: string, password: string) => Promise<void>
  setAuth: (token: string, refreshToken: string | null, usuario: Usuario) => void
  logout: () => void
  refresh: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),

  async login(correo, password) {
    const res = await apiPost<{ token: string; refreshToken: string; usuario: Usuario }>('/auth/login', { correo, password })
    localStorage.setItem('token', res.token)
    localStorage.setItem('refreshToken', res.refreshToken)
    localStorage.setItem('usuario', JSON.stringify(res.usuario))
    set({ token: res.token, refreshToken: res.refreshToken, usuario: res.usuario })
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
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('usuario')
    set({ token: null, refreshToken: null, usuario: null })
  },
}))
