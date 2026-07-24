import { useState, useEffect } from 'react'
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useContarNoLeidas } from '@/hooks/use-notificaciones'
import { useDashboardAdmin, useDashboardRecepcion, useDashboardEntrenador } from '@/hooks/use-dashboard'
import { useIndicadoresTransferencia } from '@/hooks/use-transferencias'
import { useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { RoleGuard } from '@/components/RoleGuard'
import { on, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'
import { Usuarios } from './Usuarios'
import { Clientes } from './Clientes'
import { Membresias } from './Membresias'
import { AsignarMembresia } from './AsignarMembresia'
import { EstadoMembresia } from './EstadoMembresia'
import { Alertas } from './Alertas'
import { Pagos } from './Pagos'
import { MisClientes } from './MisClientes'
import { Rutinas } from './Rutinas'
import { Ejercicios } from './Ejercicios'

const icons = {
  grid: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  users: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  card: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  dollar: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  calendar: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  dumbbell: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11v11h-11z"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6 2h1l1 4H6z"/><path d="M6 18h1l1 4H6z"/><path d="M17 2h-1l-1 4h2z"/><path d="M17 18h-1l-1 4h2z"/></svg>,
  zap: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  user: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>,
  plus: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  search: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  bell: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  logout: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  transfer: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
  clipboard: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  activity: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
}

const sidebarMenus: Record<string, { id: string; label: string; icon: keyof typeof icons; to: string; disabled?: boolean }[]> = {
  Administrador: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', to: '/dashboard' },
    { id: 'clientes', label: 'Clientes', icon: 'users', to: '/dashboard/clientes' },
    { id: 'membresias', label: 'Membresías', icon: 'card', to: '/dashboard/membresias' },
    { id: 'asignar-membresia', label: 'Asignar Membresía', icon: 'plus', to: '/dashboard/asignar-membresia' },
    { id: 'estado-membresia', label: 'Estado Membresía', icon: 'search', to: '/dashboard/estado-membresia' },
    { id: 'pagos', label: 'Pagos', icon: 'dollar', to: '/dashboard/pagos' },
    { id: 'usuarios', label: 'Usuarios', icon: 'user', to: '/dashboard/usuarios' },
    { id: 'asistencias', label: 'Asistencias', icon: 'calendar', to: '/dashboard/asistencias', disabled: true },
    { id: 'rutinas', label: 'Rutinas', icon: 'dumbbell', to: '/dashboard/rutinas' },
    { id: 'ejercicios', label: 'Ejercicios', icon: 'zap', to: '/dashboard/ejercicios' },
    { id: 'notificaciones', label: 'Notificaciones', icon: 'bell', to: '/dashboard/alertas' },
  ],
  Recepcionista: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', to: '/dashboard' },
    { id: 'clientes', label: 'Clientes', icon: 'users', to: '/dashboard/clientes' },
    { id: 'asignar-membresia', label: 'Asignar Membresía', icon: 'plus', to: '/dashboard/asignar-membresia' },
    { id: 'estado-membresia', label: 'Estado Membresía', icon: 'search', to: '/dashboard/estado-membresia' },
    { id: 'pagos', label: 'Pagos', icon: 'dollar', to: '/dashboard/pagos' },
    { id: 'asistencias', label: 'Asistencias', icon: 'calendar', to: '/dashboard/asistencias', disabled: true },
    { id: 'notificaciones', label: 'Notificaciones', icon: 'bell', to: '/dashboard/alertas' },
  ],
  Entrenador: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', to: '/dashboard' },
    { id: 'mis-clientes', label: 'Mis Clientes', icon: 'users', to: '/dashboard/mis-clientes' },
    { id: 'rutinas', label: 'Rutinas', icon: 'dumbbell', to: '/dashboard/rutinas' },
    { id: 'ejercicios', label: 'Ejercicios', icon: 'zap', to: '/dashboard/ejercicios' },
    { id: 'notificaciones', label: 'Notificaciones', icon: 'bell', to: '/dashboard/alertas' },
  ],
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { usuario, token } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: notifCount } = useContarNoLeidas()
  const noLeidas = notifCount?.total || 0

  const rol = usuario?.rol as keyof typeof sidebarMenus || 'Administrador'
  const menuItems = sidebarMenus[rol] || sidebarMenus.Administrador

  const isActive = (path?: string) => {
    if (!path) return false
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/'
    }
    return location.pathname.startsWith(path)
  }

  async function cerrarSesion() {
    try {
      await http.post('/auth/logout')
    } catch {}
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
            <p className="text-[15px] text-muted leading-tight mt-0.5">{rol.toUpperCase()}</p>
            {usuario?.nombre_gimnasio && (
              <p className="text-[12px] text-muted-dark leading-tight mt-0.5 truncate">{usuario.nombre_gimnasio}</p>
            )}
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
                {item.id === 'notificaciones' && noLeidas > 0 && (
                  <span className="bg-destructive text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0">{noLeidas}</span>
                )}
              </div>
            )

            if (item.to && !item.disabled) {
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

function IndicadorCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-card p-4">
      <span className={color || 'text-primary'}>{icon}</span>
      <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}

function DashboardAdmin() {
  const navigate = useNavigate()
  const { data: d, isLoading } = useDashboardAdmin()
  const { data: t } = useIndicadoresTransferencia()

  if (isLoading) {
    return <div className="mb-8"><div className="grid grid-cols-3 gap-4"><div className="bg-surface border border-border rounded-card p-4 animate-pulse h-24" /><div className="bg-surface border border-border rounded-card p-4 animate-pulse h-24" /><div className="bg-surface border border-border rounded-card p-4 animate-pulse h-24" /></div></div>
  }

  return (
    <div className="mb-8">
      <h1 className="font-heading text-foreground tracking-wider leading-none" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>PANEL PRINCIPAL</h1>
      <p className="text-lg text-muted mt-2">Bienvenido al sistema de administración</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <IndicadorCard icon={icons.users} label="Clientes totales" value={d?.totalClientes ?? '-'} />
        <IndicadorCard icon={icons.users} label="Clientes activos" value={d?.clientesActivos ?? '-'} color="text-green-400" />
        <IndicadorCard icon={icons.card} label="Membresías" value={d?.totalMembresias ?? '-'} />
        <IndicadorCard icon={icons.dollar} label="Ingresos totales" value={`₡${(d?.ingresos ?? 0).toLocaleString()}`} color="text-green-400" />
        <IndicadorCard icon={icons.dollar} label="Pagos registrados" value={d?.totalPagos ?? '-'} />
        <IndicadorCard icon={icons.user} label="Usuarios del sistema" value={d?.totalUsuarios ?? '-'} />
        <button onClick={() => navigate('/dashboard/alertas?tipo=TRANSFERENCIA')} className="bg-surface border border-border rounded-card p-4 text-left hover:bg-surface-light transition-colors cursor-pointer">
          <span className="text-primary">{icons.transfer}</span>
          <p className="text-2xl font-bold text-foreground mt-2">{t?.recibidas ?? 0}</p>
          <p className="text-sm text-muted">Solicitudes recibidas</p>
        </button>
        <button onClick={() => navigate('/dashboard/alertas?tipo=TRANSFERENCIA')} className="bg-surface border border-border rounded-card p-4 text-left hover:bg-surface-light transition-colors cursor-pointer">
          <span className="text-primary">{icons.transfer}</span>
          <p className="text-2xl font-bold text-foreground mt-2">{t?.enviadas ?? 0}</p>
          <p className="text-sm text-muted">Solicitudes enviadas</p>
        </button>
      </div>
    </div>
  )
}

function DashboardRecepcionista() {
  const { data: d, isLoading } = useDashboardRecepcion()

  if (isLoading) {
    return <div className="mb-8"><div className="grid grid-cols-2 gap-4"><div className="bg-surface border border-border rounded-card p-4 animate-pulse h-24" /><div className="bg-surface border border-border rounded-card p-4 animate-pulse h-24" /><div className="bg-surface border border-border rounded-card p-4 animate-pulse h-24" /><div className="bg-surface border border-border rounded-card p-4 animate-pulse h-24" /></div></div>
  }

  return (
    <div className="mb-8">
      <h1 className="font-heading text-foreground tracking-wider leading-none" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>RECEPCIÓN</h1>
      <p className="text-lg text-muted mt-2">Panel de atención al cliente</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <IndicadorCard icon={icons.users} label="Clientes registrados hoy" value={d?.clientesHoy ?? '-'} />
        <IndicadorCard icon={icons.clipboard} label="Pagos del día" value={d?.pagosHoy ?? '-'} color="text-green-400" />
        <IndicadorCard icon={icons.calendar} label="Asistencias del día" value={d?.asistenciasHoy ?? '-'} />
        <IndicadorCard icon={icons.bell} label="Membresías por vencer" value={d?.membresiasPorVencer ?? '-'} color="text-destructive" />
      </div>
    </div>
  )
}

function DashboardEntrenador() {
  const { data: d, isLoading } = useDashboardEntrenador()

  if (isLoading) {
    return <div className="mb-8"><div className="grid grid-cols-2 gap-4"><div className="bg-surface border border-border rounded-card p-4 animate-pulse h-24" /><div className="bg-surface border border-border rounded-card p-4 animate-pulse h-24" /><div className="bg-surface border border-border rounded-card p-4 animate-pulse h-24" /><div className="bg-surface border border-border rounded-card p-4 animate-pulse h-24" /></div></div>
  }

  return (
    <div className="mb-8">
      <h1 className="font-heading text-foreground tracking-wider leading-none" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>PANEL ENTRENADOR</h1>
      <p className="text-lg text-muted mt-2">Panel de entrenamiento</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <IndicadorCard icon={icons.users} label="Mis clientes asignados" value={d?.misClientes ?? '-'} />
        <IndicadorCard icon={icons.dumbbell} label="Rutinas activas" value={d?.rutinasActivas ?? '-'} color="text-green-400" />
        <IndicadorCard icon={icons.activity} label="Clientes presentes hoy" value={d?.clientesPresentesHoy ?? '-'} />
        <IndicadorCard icon={icons.bell} label="Notificaciones" value={d?.notificaciones ?? '-'} color="text-destructive" />
      </div>
    </div>
  )
}

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const usuario = useAuthStore((s) => s.usuario)
  const rol = usuario?.rol || 'Administrador'
  const queryClient = useQueryClient()

  useEffect(() => {
    const events = [
      DomainEvents.MEMBRESIA_ASIGNADA,
      DomainEvents.MEMBRESIA_RENOVADA,
      DomainEvents.MEMBRESIA_CANCELADA,
    ]
    const unsubs = events.map((ev) =>
      on(ev, () => {
        queryClient.invalidateQueries({ queryKey: QueryKeys.dashboardAdmin() })
        queryClient.invalidateQueries({ queryKey: QueryKeys.dashboardRecepcion() })
        queryClient.invalidateQueries({ queryKey: QueryKeys.dashboardEntrenador() })
      })
    )
    return () => unsubs.forEach((u) => u())
  }, [queryClient])

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
          <Route index element={
            rol === 'Administrador' ? <DashboardAdmin /> :
            rol === 'Recepcionista' ? <DashboardRecepcionista /> :
            <DashboardEntrenador />
          } />
          <Route path="usuarios" element={<RoleGuard roles={['Administrador']}><Usuarios /></RoleGuard>} />
          <Route path="clientes" element={<RoleGuard roles={['Administrador', 'Recepcionista']}><Clientes /></RoleGuard>} />
          <Route path="mis-clientes" element={<RoleGuard roles={['Entrenador']}><MisClientes /></RoleGuard>} />
          <Route path="membresias" element={<RoleGuard roles={['Administrador', 'Recepcionista']}><Membresias /></RoleGuard>} />
          <Route path="asignar-membresia" element={<RoleGuard roles={['Administrador', 'Recepcionista']}><AsignarMembresia /></RoleGuard>} />
          <Route path="estado-membresia" element={<RoleGuard roles={['Administrador', 'Recepcionista']}><EstadoMembresia /></RoleGuard>} />
          <Route path="alertas" element={<Alertas />} />
          <Route path="pagos" element={<RoleGuard roles={['Administrador', 'Recepcionista']}><Pagos /></RoleGuard>} />
          <Route path="rutinas" element={<RoleGuard roles={['Administrador', 'Entrenador']}><Rutinas /></RoleGuard>} />
          <Route path="ejercicios" element={<RoleGuard roles={['Administrador', 'Entrenador']}><Ejercicios /></RoleGuard>} />
        </Routes>
      </main>
    </div>
  )
}
