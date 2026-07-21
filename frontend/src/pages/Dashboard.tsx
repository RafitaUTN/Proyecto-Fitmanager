import { useEffect, useState } from 'react'
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Usuarios } from './Usuarios'
import { Clientes } from './Clientes'
import { Membresias } from './Membresias'
import { AsignarMembresia } from './AsignarMembresia'
import { EstadoMembresia } from './EstadoMembresia'
import { Alertas } from './Alertas'
import { Pagos } from './Pagos'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const icons = {
  grid: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  users: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  card: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  dollar: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  calendar: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>,
  dumbbell: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11v11h-11z"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6 2h1l1 4H6z"/><path d="M6 18h1l1 4H6z"/><path d="M17 2h-1l-1 4h2z"/><path d="M17 18h-1l-1 4h2z"/></svg>,
  zap: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  user: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>,
  bell: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  logout: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
}

type MenuItem = {
  id: string
  label: string
  icon: keyof typeof icons
  to?: string
  badge?: number
  disabled?: boolean
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { usuario, token } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [noLeidas, setNoLeidas] = useState(0)

  useEffect(() => {
    fetch(`${API_URL}/notificaciones/contar`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok && r.json()).then(d => d && setNoLeidas(d.total))
  }, [])

  const isActive = (path?: string) => {
    if (!path) return false
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/'
    }
    return location.pathname.startsWith(path)
  }

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', to: '/dashboard' },
    { id: 'clientes', label: 'Clientes', icon: 'users', to: '/dashboard/clientes' },
    { id: 'membresias', label: 'Membresías', icon: 'card', to: '/dashboard/membresias' },
    { id: 'pagos', label: 'Pagos', icon: 'dollar', to: '/dashboard/pagos' },
    { id: 'asistencias', label: 'Asistencias', icon: 'calendar', disabled: true },
    { id: 'rutinas', label: 'Rutinas', icon: 'dumbbell', disabled: true },
    { id: 'ejercicios', label: 'Ejercicios', icon: 'zap', disabled: true },
    { id: 'usuarios', label: 'Usuarios', icon: 'user', to: '/dashboard/usuarios' },
    { id: 'notificaciones', label: 'Notificaciones', icon: 'bell', to: '/dashboard/alertas', badge: noLeidas },
  ]

  async function cerrarSesion() {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    useAuthStore.getState().logout()
    navigate('/')
  }

  const initials = usuario
    ? `${usuario.nombre.charAt(0)}${usuario.apellido?.charAt(0) || ''}`
    : 'AD'

  return (
    <aside className="w-[300px] bg-background border-r border-white/[0.08] flex flex-col justify-between h-dvh shrink-0 overflow-hidden" style={{ padding: '20px' }}>
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-3 shrink-0">
          <img src="/assets/logo-minimalista.png" alt="FitManager" className="h-[38px] w-auto shrink-0" />
          <div>
            <h1 className="text-[32px] font-bold text-foreground leading-none tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>FitManager</h1>
            <p className="text-[15px] text-muted leading-tight mt-0.5">Administración</p>
          </div>
        </div>

        <p className="text-[13px] font-semibold tracking-[2px] text-muted-dark uppercase mt-6 mb-3 shrink-0">MENÚ PRINCIPAL</p>

        <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden min-h-0">
          {menuItems.map((item) => {
            const active = isActive(item.to)
            const content = (
              <div
                className={`flex items-center gap-3 h-12 px-4 transition-all duration-[250ms] ease-out cursor-pointer ${
                  active
                    ? 'bg-primary text-white shadow-md'
                    : item.disabled
                      ? 'text-muted-dark opacity-50 cursor-not-allowed'
                      : 'text-muted hover:text-foreground hover:bg-surface-light'
                }`}
                style={{ borderRadius: '14px' }}
              >
                <span className={`shrink-0 ${active ? 'text-white' : 'text-muted-dark'}`}>
                  {icons[item.icon]}
                </span>
                <span className="text-base font-medium leading-none flex-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-destructive text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0">{item.badge}</span>
                )}
              </div>
            )

            if (item.to) {
              return <Link key={item.id} to={item.to} onClick={onNavigate} className="block no-underline">{content}</Link>
            }
            return <div key={item.id}>{content}</div>
          })}
        </nav>
      </div>

      <div className="border-t border-white/[0.08] pt-4 space-y-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-semibold" style={{ background: '#B45309' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{usuario?.nombre || 'Administrador'}</p>
            <p className="text-xs text-muted truncate">{usuario?.correo || 'admin@fitmanager.cr'}</p>
          </div>
        </div>
        <button
          onClick={cerrarSesion}
          className="flex items-center gap-3 w-full h-12 px-4 text-muted hover:text-foreground hover:bg-surface-light transition-all duration-[250ms] text-base font-medium cursor-pointer bg-transparent border-none"
          style={{ borderRadius: '14px' }}
        >
          {icons.logout}
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}

function DashboardHome() {
  return (
    <div className="mb-8">
      <h1 className="font-heading text-foreground tracking-wider leading-none" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>PANEL PRINCIPAL</h1>
      <p className="text-lg text-muted mt-2">Bienvenido al sistema de administración</p>
    </div>
  )
}

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="bg-background flex w-full h-dvh overflow-hidden">
      <div className={`lg:hidden fixed top-4 left-4 z-50 ${sidebarOpen ? 'hidden' : ''}`}>
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 rounded-button bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="relative h-full">
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 pt-16 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8">
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="membresias" element={<Membresias />} />
          <Route path="asignar-membresia" element={<AsignarMembresia />} />
          <Route path="estado-membresia" element={<EstadoMembresia />} />
          <Route path="alertas" element={<Alertas />} />
          <Route path="pagos" element={<Pagos />} />
        </Routes>
      </main>
    </div>
  )
}
