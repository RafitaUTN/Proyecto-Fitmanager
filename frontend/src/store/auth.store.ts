import { create } from 'zustand'
import { apiGet, apiPost } from '@/lib/api'
import { setCsrfToken } from '@/lib/csrf'
import { queryClient } from '@/lib/query-client'

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

export type ActorType = 'STAFF' | 'CLIENTE'
export type StaffRole = 'Administrador' | 'Recepcionista' | 'Entrenador'

interface AuthState {
  token: string | null
  usuario: Usuario | null
  cliente: ClienteInfo | null
  actorType: ActorType | null
  role: StaffRole | 'Cliente' | null
  inicializado: boolean
  login: (correo: string, password: string) => Promise<ActorType>
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
  actorType: ActorType
  role: StaffRole | 'Cliente'
  usuario?: Usuario
  cliente?: ClienteInfo
}

let inicioEnCurso: Promise<void> | null = null
let refreshEnCurso: Promise<boolean> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  usuario: null,
  cliente: null,
  actorType: null,
  role: null,
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
        // La ausencia de cookie de sesión es el estado anónimo normal.
      }
      limpiarCompletamente()
      set({ token: null, usuario: null, cliente: null, actorType: null, role: null, inicializado: true })
    })()
    return inicioEnCurso.finally(() => { inicioEnCurso = null })
  },

  async login(correo, password) {
    const res = await apiPost<SessionResponse>('/auth/login', { correo, password })
    queryClient.clear()
    setCsrfToken(res.csrfToken)
    set({
      token: res.token,
      usuario: res.usuario ?? null,
      cliente: res.cliente ?? null,
      actorType: res.actorType,
      role: res.role,
      inicializado: true,
    })
    return res.actorType
  },

  setAuth(token: string, usuario: Usuario, csrfToken: string) {
    setCsrfToken(csrfToken)
    set({ token, usuario, cliente: null, actorType: 'STAFF', role: usuario.rol as StaffRole, inicializado: true })
  },

  refresh() {
    if (refreshEnCurso) return refreshEnCurso
    refreshEnCurso = (async () => {
      try {
        const res = await apiPost<SessionResponse>('/auth/refresh', {})
        setCsrfToken(res.csrfToken)
        set({ token: res.token, usuario: res.usuario ?? null, cliente: res.cliente ?? null, actorType: res.actorType, role: res.role })
        return true
      } catch {
        queryClient.clear()
        limpiarCompletamente()
        set({ token: null, usuario: null, cliente: null, actorType: null, role: null })
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
      set({ token: null, usuario: null, cliente: null, actorType: null, role: null })
      queryClient.clear()
    }
  },
}))
