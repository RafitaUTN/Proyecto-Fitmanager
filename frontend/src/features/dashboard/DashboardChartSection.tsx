import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts'
import { useIngresosMensuales, useNuevosClientes, useDistribucionMembresias, useMetodosPago, useClientesActivosInactivos, useAsistenciasReporte, useAsistenciasPorHora, useIngresosDiarios } from '@/hooks/use-reportes'
import { ExportModal } from '@/components/ExportModal'
import { formatMes, formatDia } from '@/lib/fecha'

const CHART_COLORS = ['#F97316', '#22C55E', '#3B82F6', '#A855F7', '#EAB308', '#EC4899', '#14B8A6', '#F43F5E']

const cardStyle = {
  background: '#141414',
  border: '1px solid #2b2b2b',
  borderRadius: '10px',
}

const tooltipStyle = { background: '#1B1B1B', border: '1px solid #2b2b2b', borderRadius: '10px', color: '#fff', fontSize: '13px' }

function fmtMoney(n: number) {
  return `₡${n.toLocaleString()}`
}

const axisTick = { fill: '#64748B', fontSize: 12 }

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

export function DashboardChartSection() {
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

  const { data: ingresos, isLoading: loadingIngresos } = useIngresosMensuales(filterParams, { enabled: modulo === 'ingresos' })
  const { data: nuevosClientes, isLoading: loadingClientes } = useNuevosClientes(filterParams, { enabled: modulo === 'clientes' })
  const { data: distribucion } = useDistribucionMembresias({ enabled: modulo === 'membresias' })
  const { data: metodosPago } = useMetodosPago(filterParams, { enabled: modulo === 'pagos' })
  const { data: activosInactivos } = useClientesActivosInactivos({ enabled: modulo === 'clientes' })
  const { data: asistencias, isLoading: loadingAsistencias } = useAsistenciasReporte(filterParams, { enabled: modulo === 'asistencias' })
  const { data: asistenciasPorHora, isLoading: loadingAsisHora } = useAsistenciasPorHora(filterParams, { enabled: modulo === 'asistencias' })
  const { data: ingresosDiarios, isLoading: loadingIngDiarios } = useIngresosDiarios(filterParams, { enabled: modulo === 'ingresos' })

  const ingresosData = useMemo(() => (ingresos ?? []).map(i => ({ ...i, label: formatMes(i.mes), total: Number(i.total) })), [ingresos])
  const ingresosDiariosData = useMemo(() => (ingresosDiarios ?? []).map(i => ({ ...i, label: formatDia(i.mes), total: Number(i.total) })), [ingresosDiarios])
  const clientesData = useMemo(() => (nuevosClientes ?? []).map(c => ({ ...c, label: formatMes(c.mes) })), [nuevosClientes])
  const asistenciasData = useMemo(() => (asistencias ?? []).map(a => ({ ...a, label: formatMes(a.mes) })), [asistencias])
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
    { id: 'ingresos', label: 'Ingresos', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { id: 'clientes', label: 'Clientes', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'membresias', label: 'Membresías', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
    { id: 'asistencias', label: 'Asistencias', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { id: 'pagos', label: 'Pagos', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> },
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
