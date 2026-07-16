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
  usuario: Usuario | null
  login: (correo: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),

  async login(correo, password) {
    const res = await apiPost<{ token: string; usuario: Usuario }>('/auth/login', { correo, password })
    localStorage.setItem('token', res.token)
    localStorage.setItem('usuario', JSON.stringify(res.usuario))
    set({ token: res.token, usuario: res.usuario })
  },

  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    set({ token: null, usuario: null })
  },
}))
