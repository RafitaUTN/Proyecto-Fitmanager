import { useState } from 'react'
import { Link, Routes, Route, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { ClienteInicio } from './ClienteInicio'
import { ClienteMembresia } from './ClienteMembresia'
import { ClienteRutinas } from './ClienteRutinas'
import { ClientePerfil } from './ClientePerfil'

const icons = {
  grid: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  dumbbell: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11v11h-11z"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6 2h1l1 4H6z"/><path d="M6 18h1l1 4H6z"/><path d="M17 2h-1l-1 4h2z"/><path d="M17 18h-1l-1 4h2z"/></svg>,
  user: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>,
  logout: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  card: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
}

const menuItems = [
  { id: 'inicio', label: 'Inicio', icon: 'grid' as const, to: '/cliente' },
  { id: 'membresia', label: 'Mi Membresía', icon: 'card' as const, to: '/cliente/membresia' },
  { id: 'rutinas', label: 'Mis Rutinas', icon: 'dumbbell' as const, to: '/cliente/rutinas' },
  { id: 'perfil', label: 'Mi Perfil', icon: 'user' as const, to: '/cliente/perfil' },
]

function ClienteSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { cliente, logout } = useAuthStore()
  const location = useLocation()

  function handleLogout() {
    logout()
    window.location.href = '/login'
  }

  return (
    <aside className="w-[300px] h-dvh flex flex-col justify-between overflow-hidden bg-surface border-r border-border p-5">
      <div>
        <Link to="/cliente" className="flex items-center gap-3 mb-10 no-underline" onClick={onNavigate}>
          <img src="/assets/logo-minimalista.png" alt="" className="w-11 h-auto" />
          <div>
            <h1 className="font-heading text-[32px] text-foreground leading-none tracking-wider">FitManager</h1>
            <p className="text-[15px] text-muted-dark leading-tight mt-0.5">Portal del Cliente</p>
          </div>
        </Link>

        <nav className="space-y-0.5">
          {menuItems.map((item) => {
            const isActive = item.id === 'inicio'
              ? location.pathname === '/cliente'
              : location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.id}
                to={item.to}
                onClick={onNavigate}
                className={`flex items-center gap-3 h-12 px-4 rounded-[14px] text-[16px] font-medium transition-all duration-200 no-underline ${
                  isActive
                    ? 'bg-primary text-white shadow-[0_4px_14px_rgba(249,115,22,0.35)]'
                    : 'text-muted hover:text-foreground hover:bg-surface-light'
                }`}
              >
                <span className="shrink-0">{icons[item.icon as keyof typeof icons]}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center gap-3 px-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {cliente?.nombre?.charAt(0)?.toUpperCase()}{cliente?.apellido?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{cliente?.nombre} {cliente?.apellido}</p>
            <p className="text-xs text-muted-dark truncate">{cliente?.correo}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 h-12 px-4 rounded-[14px] text-[16px] font-medium text-muted hover:text-foreground hover:bg-surface-light transition-colors w-full cursor-pointer"
        >
          <span className="shrink-0">{icons.logout}</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}

export function ClienteLayout() {
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
          <ClienteSidebar onNavigate={() => setSidebarOpen(false)} />
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
          <Route index element={<ClienteInicio />} />
          <Route path="membresia" element={<ClienteMembresia />} />
          <Route path="rutinas" element={<ClienteRutinas />} />
          <Route path="perfil" element={<ClientePerfil />} />
        </Routes>
      </main>
    </div>
  )
}