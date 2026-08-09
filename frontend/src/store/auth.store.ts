import { create } from 'zustand'
import { apiGet, apiPost } from '@/lib/api'
import { setCsrfToken } from '@/lib/csrf'

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
}

interface AuthState {
  token: string | null
  usuario: Usuario | null
  cliente: ClienteInfo | null
  inicializado: boolean
  login: (correo: string, password: string) => Promise<void>
  loginCliente: (correo: string, password: string) => Promise<void>
  setAuth: (token: string, usuario: Usuario, csrfToken: string) => void
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
  iniciar: () => Promise<void>
}

function limpiarCompletamente() {
  // Limpia residuos de versiones anteriores. Ninguna credencial nueva se persiste.
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('usuario')
  localStorage.removeItem('cliente')
  setCsrfToken(null)
}

interface SessionResponse {
  token: string
  csrfToken: string
  usuario?: Usuario
  cliente?: ClienteInfo
}

let inicioEnCurso: Promise<void> | null = null
let refreshEnCurso: Promise<boolean> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  usuario: null,
  cliente: null,
  inicializado: false,

  iniciar() {
    if (get().inicializado) return Promise.resolve()
    if (inicioEnCurso) return inicioEnCurso
    inicioEnCurso = (async () => {
      limpiarCompletamente()
      try {
        const csrf = await apiGet<{ csrfToken: string }>('/auth/csrf')
        setCsrfToken(csrf.csrfToken)
        const ok = await get().refresh()
        if (ok) {
          set({ inicializado: true })
          return
        }
      } catch {
        // La ausencia de cookie de sesiÃ³n es el estado anÃ³nimo normal.
      }
      limpiarCompletamente()
      set({ token: null, usuario: null, cliente: null, inicializado: true })
    })()
    return inicioEnCurso.finally(() => { inicioEnCurso = null })
  },

  async login(correo, password) {
    const res = await apiPost<SessionResponse & { usuario: Usuario }>('/auth/login', { correo, password })
    setCsrfToken(res.csrfToken)
    set({ token: res.token, usuario: res.usuario, cliente: null, inicializado: true })
  },

  async loginCliente(correo, password) {
    const res = await apiPost<SessionResponse & { cliente: ClienteInfo }>('/auth/login-cliente', { correo, password })
    setCsrfToken(res.csrfToken)
    set({ token: res.token, cliente: res.cliente, usuario: null, inicializado: true })
  },

  setAuth(token: string, usuario: Usuario, csrfToken: string) {
    setCsrfToken(csrfToken)
    set({ token, usuario, cliente: null, inicializado: true })
  },

  refresh() {
    if (refreshEnCurso) return refreshEnCurso
    refreshEnCurso = (async () => {
      try {
        const res = await apiPost<SessionResponse>('/auth/refresh', {})
        setCsrfToken(res.csrfToken)
        set({ token: res.token, usuario: res.usuario ?? null, cliente: res.cliente ?? null })
        return true
      } catch {
        limpiarCompletamente()
        set({ token: null, usuario: null, cliente: null })
        return false
      }
    })()
    return refreshEnCurso.finally(() => { refreshEnCurso = null })
  },

  async logout() {
    try {
      await apiPost('/auth/logout', {})
    } catch {
      // La revocación remota es best-effort; el cliente siempre debe salir.
    } finally {
      limpiarCompletamente()
      set({ token: null, usuario: null, cliente: null })
    }
  },
}))
