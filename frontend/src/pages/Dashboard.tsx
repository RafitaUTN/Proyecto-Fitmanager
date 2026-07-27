import { useState, useEffect, useMemo, memo } from 'react'
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useContarNoLeidas } from '@/hooks/use-notificaciones'
import { useDashboardAdmin, useDashboardRecepcion, useDashboardEntrenador } from '@/hooks/use-dashboard'

import { useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { RoleGuard } from '@/components/RoleGuard'
import { on, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts'
import { useIngresosMensuales, useNuevosClientes, useDistribucionMembresias, useMetodosPago, useClientesActivosInactivos, useAsistenciasReporte, useAsistenciasPorHora, useIngresosDiarios } from '@/hooks/use-reportes'
import { usePagos } from '@/hooks/use-pagos'
import { useClientes } from '@/hooks/use-clientes'
import { useRutinas } from '@/hooks/use-rutinas'
import { useEjercicios } from '@/hooks/use-ejercicios'
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { ExportModal } from '@/components/ExportModal'
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
import { Asistencias } from './Asistencias'
import { Reportes } from './Reportes'

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
  trendUp: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  clock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
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
    { id: 'asistencias', label: 'Asistencias', icon: 'calendar', to: '/dashboard/asistencias' },
    { id: 'rutinas', label: 'Rutinas', icon: 'dumbbell', to: '/dashboard/rutinas' },
    { id: 'ejercicios', label: 'Ejercicios', icon: 'zap', to: '/dashboard/ejercicios' },
    { id: 'reportes', label: 'Reportes', icon: 'clipboard', to: '/dashboard/reportes' },
    { id: 'notificaciones', label: 'Notificaciones', icon: 'bell', to: '/dashboard/alertas' },
  ],
  Recepcionista: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', to: '/dashboard' },
    { id: 'clientes', label: 'Clientes', icon: 'users', to: '/dashboard/clientes' },
    { id: 'asignar-membresia', label: 'Asignar Membresía', icon: 'plus', to: '/dashboard/asignar-membresia' },
    { id: 'estado-membresia', label: 'Estado Membresía', icon: 'search', to: '/dashboard/estado-membresia' },
    { id: 'pagos', label: 'Pagos', icon: 'dollar', to: '/dashboard/pagos' },
    { id: 'asistencias', label: 'Asistencias', icon: 'calendar', to: '/dashboard/asistencias' },
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
  const { usuario } = useAuthStore()
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

const CHART_COLORS = ['#F97316', '#22C55E', '#3B82F6', '#A855F7', '#EAB308', '#EC4899', '#14B8A6', '#F43F5E']

const cardStyle = {
  background: '#141414',
  border: '1px solid #2b2b2b',
  borderRadius: '10px',
}

const tooltipStyle = { background: '#1B1B1B', border: '1px solid #2b2b2b', borderRadius: '10px', color: '#fff', fontSize: '13px' }

function fmtMes(mes: string) {
  const d = new Date(mes)
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
}

function fmtMoney(n: number) {
  return `₡${n.toLocaleString()}`
}

const axisTick = { fill: '#64748B', fontSize: 12 }

const MetricCard = memo(function MetricCard({ icon, label, value, trend, color }: { icon: React.ReactNode; label: string; value: number | string; trend?: string; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={cardStyle}
      className="p-4 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between">
        <span style={{ color: color || '#F97316' }} className="flex items-center">{icon}</span>
        {trend && (
          <span className="flex items-center gap-1 text-[11px] text-green-400 font-medium">
            {icons.trendUp}{trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground mt-3 leading-none">{value}</p>
      <p className="text-muted text-xs mt-1">{label}</p>
    </motion.div>
  )
})

const MiniStat = memo(function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-foreground font-semibold text-sm" style={{ color }}>{value}</span>
    </div>
  )
})

function DashboardAdmin() {
  const { data: d, isLoading } = useDashboardAdmin()
  const { data: rutinasList } = useRutinas()
  const { data: ejerciciosList } = useEjercicios()

  if (isLoading) {
    return (
      <div className="flex gap-5 p-6">
        <div className="flex-1 space-y-5">
          <div className="grid grid-cols-4 gap-5">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} style={cardStyle} className="h-[110px] animate-pulse" />)}
          </div>
        </div>
      </div>
    )
  }

  const clientesActivos = d?.clientesActivos || 0
  const rutinasCount = rutinasList?.length ?? 0
  const ejerciciosCount = ejerciciosList?.length ?? 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="mb-6">
        <h1 className="font-heading text-foreground tracking-wider leading-none" style={{ fontSize: 'clamp(32px, 2.8vw, 48px)' }}>DASHBOARD</h1>
        <p className="text-muted" style={{ fontSize: '15px' }}>Resumen general del gimnasio</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-6">
        <MetricCard icon={icons.users} label="Clientes activos" value={clientesActivos} trend="100%" color="#F97316" />
        <MetricCard icon={icons.dollar} label="Ingresos totales" value={fmtMoney(d?.ingresos ?? 0)} color="#22C55E" />
        <MetricCard icon={icons.card} label="Membresías" value={d?.totalMembresias ?? 0} color="#3B82F6" />
        <MetricCard icon={icons.activity} label="Asistencias hoy" value={d?.asistenciasHoy ?? 0} color="#A855F7" />
        <MetricCard icon={icons.clipboard} label="Pagos registrados" value={d?.totalPagos ?? 0} color="#EAB308" />
        <MetricCard icon={icons.dumbbell} label="Rutinas" value={rutinasCount} color="#14B8A6" />
        <MetricCard icon={icons.zap} label="Ejercicios" value={ejerciciosCount} color="#EC4899" />
        <MetricCard icon={icons.user} label="Usuarios" value={d?.totalUsuarios ?? 0} color="#F43F5E" />
      </div>

      <DashboardChartSection />
    </motion.div>
  )
}

const PERIOD_PRESETS = [
  { id: '', label: 'Sin filtro' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: '30d', label: '30 días' },
  { id: '90d', label: '90 días' },
  { id: 'anio', label: 'Año' },
] as const

function calcularRango(periodo: string): { fecha_inicio?: string; fecha_fin?: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  switch (periodo) {
    case 'hoy':
      return { fecha_inicio: fmt(now), fecha_fin: fmt(now) }
    case 'semana': {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay() + 1)
      return { fecha_inicio: fmt(start), fecha_fin: fmt(now) }
    }
    case 'mes':
      return { fecha_inicio: fmt(new Date(y, m, 1)), fecha_fin: fmt(now) }
    case '30d': {
      const start = new Date(now)
      start.setDate(now.getDate() - 30)
      return { fecha_inicio: fmt(start), fecha_fin: fmt(now) }
    }
    case '90d': {
      const start = new Date(now)
      start.setDate(now.getDate() - 90)
      return { fecha_inicio: fmt(start), fecha_fin: fmt(now) }
    }
    case 'anio':
      return { fecha_inicio: fmt(new Date(y, 0, 1)), fecha_fin: fmt(now) }
    default:
      return {}
  }
}

interface ModuloFiltros {
  modulo: string
  periodo: string
  fecha_inicio: string
  fecha_fin: string
}

function DashboardChartSection() {
  const [modulo, setModulo] = useState('')
  const [filtros, setFiltros] = useState<ModuloFiltros>({ modulo: '', periodo: '', fecha_inicio: '', fecha_fin: '' })
  const [exportOpen, setExportOpen] = useState(false)

  const filterParams = useMemo(() => {
    if (filtros.periodo === 'personalizado') {
      return filtros.fecha_inicio || filtros.fecha_fin ? { fecha_inicio: filtros.fecha_inicio || undefined, fecha_fin: filtros.fecha_fin || undefined } : undefined
    }
    if (!filtros.periodo) return undefined
    return calcularRango(filtros.periodo)
  }, [filtros])

  const { data: ingresos, isLoading: loadingIngresos } = useIngresosMensuales(modulo === 'ingresos' ? filterParams : undefined)
  const { data: nuevosClientes, isLoading: loadingClientes } = useNuevosClientes(modulo === 'clientes' ? filterParams : undefined)
  const { data: distribucion } = useDistribucionMembresias()
  const { data: metodosPago } = useMetodosPago(modulo === 'pagos' ? filterParams : undefined)
  const { data: activosInactivos } = useClientesActivosInactivos()
  const { data: asistencias, isLoading: loadingAsistencias } = useAsistenciasReporte(modulo === 'asistencias' ? filterParams : undefined)
  const { data: asistenciasPorHora, isLoading: loadingAsisHora } = useAsistenciasPorHora(modulo === 'asistencias' ? filterParams : undefined)
  const { data: ingresosDiarios, isLoading: loadingIngDiarios } = useIngresosDiarios(modulo === 'ingresos' ? filterParams : undefined)

  const ingresosData = useMemo(() => (ingresos ?? []).map(i => ({ ...i, label: fmtMes(i.mes), total: Number(i.total) })), [ingresos])
  const ingresosDiariosData = useMemo(() => (ingresosDiarios ?? []).map(i => ({ ...i, label: new Date(i.mes).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), total: Number(i.total) })), [ingresosDiarios])
  const clientesData = useMemo(() => (nuevosClientes ?? []).map(c => ({ ...c, label: fmtMes(c.mes) })), [nuevosClientes])
  const asistenciasData = useMemo(() => (asistencias ?? []).map(a => ({ ...a, label: fmtMes(a.mes) })), [asistencias])
  const asistenciasHora = useMemo(() => (asistenciasPorHora ?? []).sort((a, b) => a.hora - b.hora), [asistenciasPorHora])
  const distData = distribucion ?? []
  const metodosData = useMemo(() => (metodosPago ?? []).map(m => ({ ...m, total: Number(m.total) })), [metodosPago])

  function seleccionarModulo(id: string) {
    if (modulo === id) {
      setModulo('')
      setFiltros({ modulo: '', periodo: '', fecha_inicio: '', fecha_fin: '' })
    } else {
      setModulo(id)
      setFiltros({ modulo: id, periodo: 'mes', fecha_inicio: '', fecha_fin: '' })
    }
  }

  function actualizarPeriodo(periodo: string) {
    setFiltros(prev => ({ ...prev, periodo }))
  }

  const modulos = [
    { id: 'ingresos', label: 'Ingresos', icon: icons.dollar },
    { id: 'clientes', label: 'Clientes', icon: icons.users },
    { id: 'membresias', label: 'Membresías', icon: icons.card },
    { id: 'asistencias', label: 'Asistencias', icon: icons.activity },
    { id: 'pagos', label: 'Pagos', icon: icons.clipboard },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {modulos.map(m => (
            <button
              key={m.id}
              onClick={() => seleccionarModulo(m.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border transition-all cursor-pointer ${
                modulo === m.id
                  ? 'border-primary bg-primary/15 text-primary shadow-sm'
                  : 'border-border text-muted hover:text-foreground hover:border-white/20 bg-surface-light/50'
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface-light transition-all cursor-pointer"
        >
          <Download size={16} />
          Exportar
        </button>
      </div>

      {modulo && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <span className="text-xs text-muted-dark font-medium mr-1">FILTRAR POR:</span>
          {PERIOD_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => actualizarPeriodo(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all cursor-pointer ${
                filtros.periodo === p.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </motion.div>
      )}

      {!modulo && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={cardStyle} className="p-10 text-center">
          <p className="text-muted-dark text-sm">Selecciona un módulo para ver sus gráficos y estadísticas</p>
        </motion.div>
      )}

      {modulo === 'ingresos' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} key="ingresos" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div data-chart="true" style={cardStyle} className="p-5">
            <h3 className="text-foreground font-semibold mb-4" style={{ fontSize: '15px' }}>Ingresos mensuales</h3>
            {loadingIngresos ? (
              <div className="h-[340px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : ingresosData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={ingresosData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => `₡${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMoney(v), 'Total']} />
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="total" stroke="none" fill="url(#incomeGrad)" />
                  <Line type="monotone" dataKey="total" stroke="#F97316" strokeWidth={2} dot={{ fill: '#F97316', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[340px] flex items-center justify-center text-muted-dark text-sm">Sin datos en este período</div>
            )}
          </div>
          <div data-chart="true" style={cardStyle} className="p-5">
            <h3 className="text-foreground font-semibold mb-4" style={{ fontSize: '15px' }}>Ingresos diarios</h3>
            {loadingIngDiarios ? (
              <div className="h-[340px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : ingresosDiariosData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={ingresosDiariosData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => `₡${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMoney(v), 'Total']} />
                  <Bar dataKey="total" fill="#F97316" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[340px] flex items-center justify-center text-muted-dark text-sm">Sin datos en este período</div>
            )}
          </div>
        </motion.div>
      )}

      {modulo === 'clientes' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} key="clientes" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div data-chart="true" style={cardStyle} className="p-5">
            <h3 className="text-foreground font-semibold mb-4" style={{ fontSize: '15px' }}>Clientes nuevos</h3>
            {loadingClientes ? (
              <div className="h-[340px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : clientesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={clientesData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, 'Clientes nuevos']} />
                  <Bar dataKey="cantidad" fill="#22C55E" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[340px] flex items-center justify-center text-muted-dark text-sm">Sin datos en este período</div>
            )}
          </div>
          {activosInactivos && (
            <div data-chart="true" style={cardStyle} className="p-5">
              <h3 className="text-foreground font-semibold mb-4" style={{ fontSize: '15px' }}>Estado de clientes</h3>
              <div className="flex flex-col items-center justify-center h-[340px] gap-6">
                <div className="flex gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-400">{activosInactivos.activos}</div>
                    <div className="text-muted text-sm mt-1">Activos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-red-400">{activosInactivos.inactivos}</div>
                    <div className="text-muted text-sm mt-1">Inactivos</div>
                  </div>
                </div>
                <ResponsiveContainer width="60%" height={180}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Activos', value: activosInactivos.activos },
                      { name: 'Inactivos', value: activosInactivos.inactivos },
                    ]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      <Cell fill="#22C55E" />
                      <Cell fill="#EF4444" />
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {modulo === 'membresias' && distData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} key="membresias" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div data-chart="true" style={cardStyle} className="p-5">
            <h3 className="text-foreground font-semibold mb-4" style={{ fontSize: '15px' }}>Distribución membresías</h3>
            <div className="flex flex-col items-center justify-center h-[340px]">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={distData} dataKey="total" nameKey="nombre" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                    {distData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [v, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {distData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted text-xs">{item.nombre}: {item.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {modulo === 'asistencias' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} key="asistencias" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div data-chart="true" style={cardStyle} className="p-5">
            <h3 className="text-foreground font-semibold mb-4" style={{ fontSize: '15px' }}>Asistencias mensuales</h3>
            {loadingAsistencias ? (
              <div className="h-[340px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : asistenciasData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={asistenciasData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, 'Asistencias']} />
                  <Bar dataKey="cantidad" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[340px] flex items-center justify-center text-muted-dark text-sm">Sin datos en este período</div>
            )}
          </div>
          <div data-chart="true" style={cardStyle} className="p-5">
            <h3 className="text-foreground font-semibold mb-4" style={{ fontSize: '15px' }}>Asistencias por hora</h3>
            {loadingAsisHora ? (
              <div className="h-[340px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : asistenciasHora.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={asistenciasHora} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="hora" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(h: number) => `${h}:00`} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any, _: any, props?: { payload?: { hora?: number } }) => [v, props?.payload?.hora != null ? `${props.payload.hora}:00` : '']} />
                  <Bar dataKey="cantidad" fill="#A855F7" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[340px] flex items-center justify-center text-muted-dark text-sm">Sin datos en este período</div>
            )}
          </div>
        </motion.div>
      )}

      {modulo === 'pagos' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} key="pagos" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div data-chart="true" style={cardStyle} className="p-5">
            <h3 className="text-foreground font-semibold mb-4" style={{ fontSize: '15px' }}>Métodos de pago</h3>
            {metodosData.length > 0 ? (
              <div className="space-y-4 pt-4">
                {metodosData.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-foreground font-medium capitalize">{m.metodo_pago}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-foreground font-semibold">{fmtMoney(m.total)}</div>
                      <div className="text-muted-dark text-xs">{m.cantidad} transacciones</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[340px] flex items-center justify-center text-muted-dark text-sm">Sin datos en este período</div>
            )}
          </div>
        </motion.div>
      )}

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        moduloActual={modulo || undefined}
        filtrosActuales={filterParams}
      />
    </div>
  )
}

function DashboardRecepcionista() {
  const { data: d, isLoading } = useDashboardRecepcion()
  const { data: pagosList } = usePagos()
  const { data: clientesList } = useClientes()

  if (isLoading) {
    return <div className="flex gap-5 p-6"><div className="flex-1 grid grid-cols-2 gap-5">{[1,2,3,4].map(i => <div key={i} style={cardStyle} className="h-[110px] animate-pulse" />)}</div></div>
  }

  const recientes = (pagosList ?? []).slice(0, 4)
  const ultimosClientes = (clientesList ?? []).slice(0, 3)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-foreground tracking-wider leading-none" style={{ fontSize: 'clamp(32px, 2.8vw, 48px)' }}>RECEPCIÓN</h1>
          <p className="text-muted" style={{ fontSize: '15px' }}>Panel de atención al cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard icon={icons.users} label="Clientes hoy" value={d?.clientesHoy ?? 0} color="#F97316" />
        <MetricCard icon={icons.clipboard} label="Pagos del día" value={fmtMoney(d?.pagosHoy ?? 0)} color="#22C55E" />
        <MetricCard icon={icons.activity} label="Asistencias" value={d?.asistenciasHoy ?? 0} color="#3B82F6" />
        <MetricCard icon={icons.bell} label="Por vencer (7d)" value={d?.membresiasPorVencer ?? 0} color="#EF4444" />
      </div>

      <div className="flex flex-col xl:flex-row gap-5 mt-5">
        <div className="flex-1 min-w-0 space-y-5">
          {recientes.length > 0 && (
            <div style={cardStyle} className="p-5">
              <h3 className="text-foreground font-semibold mb-4" style={{ fontSize: '15px' }}>Últimos pagos</h3>
              <div className="space-y-2">
                {recientes.map(p => (
                  <div key={p.id_pago} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">{icons.dollar}</div>
                      <div>
                        <p className="text-foreground text-sm font-medium">{p.cliente?.nombre} {p.cliente?.apellido}</p>
                        <p className="text-muted-dark text-xs">{p.cliente_membresia?.membresia?.nombre}</p>
                      </div>
                    </div>
                    <span className="text-foreground font-semibold text-sm">{fmtMoney(p.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-full xl:w-[320px] space-y-5 shrink-0">
          {ultimosClientes.length > 0 && (
            <div style={cardStyle} className="p-5">
              <h3 className="text-foreground font-semibold mb-3" style={{ fontSize: '15px' }}>Clientes recientes</h3>
              <div className="space-y-2">
                {ultimosClientes.map(c => (
                  <div key={c.id_cliente} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">{c.nombre[0]}{c.apellido[0]}</div>
                      <p className="text-foreground text-sm">{c.nombre} {c.apellido}</p>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${c.estado ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{c.estado ? 'Activo' : 'Inactivo'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function DashboardEntrenador() {
  const { data: d, isLoading } = useDashboardEntrenador()
  const { data: rutinasList } = useRutinas()

  if (isLoading) {
    return <div className="flex gap-5 p-6"><div className="flex-1 grid grid-cols-2 gap-5">{[1,2,3,4].map(i => <div key={i} style={cardStyle} className="h-[110px] animate-pulse" />)}</div></div>
  }

  const misRutinas = (rutinasList ?? []).filter(r => r.entrenadores?.some(e => e.id_entrenador === Number(useAuthStore.getState().usuario?.id_usuario)))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-foreground tracking-wider leading-none" style={{ fontSize: 'clamp(32px, 2.8vw, 48px)' }}>ENTRENADOR</h1>
          <p className="text-muted" style={{ fontSize: '15px' }}>Panel de entrenamiento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard icon={icons.users} label="Mis clientes" value={d?.misClientes ?? 0} color="#F97316" />
        <MetricCard icon={icons.dumbbell} label="Rutinas activas" value={d?.rutinasActivas ?? 0} color="#22C55E" />
        <MetricCard icon={icons.activity} label="Clientes presentes" value={d?.clientesPresentesHoy ?? 0} color="#3B82F6" />
        <MetricCard icon={icons.bell} label="Notificaciones" value={d?.notificaciones ?? 0} color="#EF4444" />
      </div>

      <div className="flex flex-col xl:flex-row gap-5 mt-5">
        <div className="flex-1 min-w-0 space-y-5">
          {misRutinas.length > 0 && (
            <div style={cardStyle} className="p-5">
              <h3 className="text-foreground font-semibold mb-4" style={{ fontSize: '15px' }}>Mis rutinas</h3>
              <div className="space-y-2">
                {misRutinas.slice(0, 5).map(r => (
                  <div key={r.id_rutina} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary">{icons.dumbbell}</div>
                      <div>
                        <p className="text-foreground text-sm font-medium">{r.nombre}</p>
                        <p className="text-muted-dark text-xs">{r._count?.cliente_rutinas ?? 0} clientes · {r._count?.rutina_ejercicios ?? 0} ejercicios</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${r.estado ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{r.estado ? 'Activa' : 'Inactiva'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-full xl:w-[320px] space-y-5 shrink-0">
          <div style={cardStyle} className="p-5">
            <h3 className="text-foreground font-semibold mb-3" style={{ fontSize: '15px' }}>Resumen rápido</h3>
            <div>
              <MiniStat label="Clientes asignados" value={d?.misClientes ?? 0} />
              <MiniStat label="Rutinas activas" value={d?.rutinasActivas ?? 0} color="#22C55E" />
              <MiniStat label="Presentes hoy" value={d?.clientesPresentesHoy ?? 0} color="#3B82F6" />
              <MiniStat label="Notificaciones" value={d?.notificaciones ?? 0} color="#EF4444" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const usuario = useAuthStore((s) => s.usuario)
  const rol = usuario?.rol || 'Administrador'
  const queryClient = useQueryClient()

  useEffect(() => {
    const dashboardEvents = [
      DomainEvents.MEMBRESIA_ASIGNADA,
      DomainEvents.MEMBRESIA_RENOVADA,
      DomainEvents.MEMBRESIA_CANCELADA,
      DomainEvents.ASISTENCIA_ENTRADA,
      DomainEvents.ASISTENCIA_SALIDA,
      DomainEvents.PAGO_REALIZADO,
      DomainEvents.RUTINA_CREADA,
      DomainEvents.RUTINA_EDITADA,
      DomainEvents.RUTINA_ELIMINADA,
      DomainEvents.RUTINA_ASIGNADA,
      DomainEvents.RUTINA_ASIGNADA_ENTRENADOR,
      DomainEvents.RUTINA_REMOVIDA_ENTRENADOR,
      DomainEvents.EJERCICIO_CREADO,
      DomainEvents.EJERCICIO_EDITADO,
      DomainEvents.EJERCICIO_ELIMINADO,
      DomainEvents.CLIENTE_CREADO,
      DomainEvents.CLIENTE_ACTUALIZADO,
      DomainEvents.CLIENTE_ELIMINADO,
    ]
    const unsubs = dashboardEvents.map((ev) =>
      on(ev, () => {
        queryClient.invalidateQueries({ queryKey: QueryKeys.dashboardAdmin() })
        queryClient.invalidateQueries({ queryKey: QueryKeys.dashboardRecepcion() })
        queryClient.invalidateQueries({ queryKey: QueryKeys.dashboardEntrenador() })
        queryClient.invalidateQueries({ queryKey: QueryKeys.asistenciasHoy() })
        queryClient.invalidateQueries({ queryKey: ['reportes'] })
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

      <main className="flex-1 overflow-y-auto p-4 pt-16 sm:p-6 sm:pt-20 lg:p-6 lg:pt-6">
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
          <Route path="asistencias" element={<RoleGuard roles={['Administrador', 'Recepcionista']}><Asistencias /></RoleGuard>} />
          <Route path="reportes" element={<RoleGuard roles={['Administrador']}><Reportes /></RoleGuard>} />
        </Routes>
      </main>
    </div>
  )
}
