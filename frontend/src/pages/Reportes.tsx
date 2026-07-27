import { useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts'
import { useIngresosMensuales, useNuevosClientes, useDistribucionMembresias, useMetodosPago, useClientesActivosInactivos, useAsistenciasReporte, useAsistenciasPorHora, useIngresosDiarios } from '@/hooks/use-reportes'
import { Button } from '@/components/ui/Button'
import { downloadReport } from '@/lib/download'

const cardStyle = {
  background: '#121212',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '18px',
}

const CHART_COLORS = ['#F97316', '#22C55E', '#3B82F6', '#A855F7', '#EAB308', '#EC4899', '#14B8A6', '#F43F5E']

const tooltipStyle = {
  background: '#1B1B1B',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '13px',
}

const axisTick = { fill: '#64748B', fontSize: 12 }

function fmtMoney(n: number) {
  return '₡' + n.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtMes(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-CR', { month: 'short', year: 'numeric' })
}

const tabs = [
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'membresias', label: 'Membresías' },
  { id: 'asistencias', label: 'Asistencias' },
  { id: 'pagos', label: 'Pagos' },
]

export function Reportes() {
  const [activeTab, setActiveTab] = useState('ingresos')

  const { data: ingresos } = useIngresosMensuales()
  const { data: nuevosClientes } = useNuevosClientes()
  const { data: distribucion } = useDistribucionMembresias()
  const { data: metodosPago } = useMetodosPago()
  const { data: activosInactivos } = useClientesActivosInactivos()
  const { data: asistencias } = useAsistenciasReporte()
  const { data: asistenciasPorHora } = useAsistenciasPorHora()
  const { data: ingresosDiarios } = useIngresosDiarios()

  const ingresosData = (ingresos ?? []).map(i => ({ ...i, label: fmtMes(i.mes), total: Number(i.total) }))
  const clientesData = (nuevosClientes ?? []).map(c => ({ ...c, label: fmtMes(c.mes) }))
  const asistenciasData = (asistencias ?? []).map(a => ({ ...a, label: fmtMes(a.mes) }))
  const distData = distribucion ?? []
  const metodosData = (metodosPago ?? []).map(m => ({ ...m, total: Number(m.total) }))
  const horasData = (asistenciasPorHora ?? []).map(h => ({ ...h, label: `${h.hora}:00` }))
  const diariosData = (ingresosDiarios ?? []).map((d: any) => ({ ...d, label: d.dia ? new Date(d.dia).toLocaleDateString('es-CR', { day: '2-digit', month: 'short' }) : '', total: Number(d.total) }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-foreground tracking-wider leading-none" style={{ fontSize: 'clamp(32px, 2.8vw, 48px)' }}>REPORTES</h1>
          <p className="text-muted" style={{ fontSize: '15px' }}>Análisis detallado del gimnasio</p>
        </div>
      </div>

      <div className="flex bg-surface-light rounded-lg p-0.5 gap-0.5 mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === tab.id ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ingresos' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={cardStyle} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground font-semibold" style={{ fontSize: '15px' }}>Ingresos mensuales</h3>
                <Button variant="outline" size="sm" onClick={() => downloadReport('ingresos-mensuales')}>Exportar CSV</Button>
              </div>
              {ingresosData.length > 0 ? (
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
                <div className="flex items-center justify-center h-[340px] text-muted text-sm">Sin datos de ingresos</div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={cardStyle} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground font-semibold" style={{ fontSize: '15px' }}>Ingresos diarios</h3>
                <Button variant="outline" size="sm" onClick={() => downloadReport('ingresos-diarios')}>Exportar CSV</Button>
              </div>
              {diariosData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={diariosData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => `₡${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMoney(v), 'Total']} />
                    <Bar dataKey="total" fill="#F97316" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[340px] text-muted text-sm">Sin datos de ingresos diarios</div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {activeTab === 'clientes' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={cardStyle} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground font-semibold" style={{ fontSize: '15px' }}>Clientes nuevos</h3>
                <Button variant="outline" size="sm" onClick={() => downloadReport('nuevos-clientes')}>Exportar CSV</Button>
              </div>
              {clientesData.length > 0 ? (
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
                <div className="flex items-center justify-center h-[340px] text-muted text-sm">Sin datos de clientes</div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={cardStyle} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground font-semibold" style={{ fontSize: '15px' }}>Estado de clientes</h3>
                <Button variant="outline" size="sm" onClick={() => downloadReport('clientes-activos-inactivos')}>Exportar CSV</Button>
              </div>
              {activosInactivos ? (
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
              ) : (
                <div className="flex items-center justify-center h-[340px] text-muted text-sm">Sin datos</div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {activeTab === 'membresias' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={cardStyle} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground font-semibold" style={{ fontSize: '15px' }}>Distribución membresías</h3>
                <Button variant="outline" size="sm" onClick={() => downloadReport('distribucion-membresias')}>Exportar CSV</Button>
              </div>
              {distData.length > 0 ? (
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
              ) : (
                <div className="flex items-center justify-center h-[340px] text-muted text-sm">Sin datos de membresías</div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {activeTab === 'asistencias' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={cardStyle} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground font-semibold" style={{ fontSize: '15px' }}>Asistencias mensuales</h3>
                <Button variant="outline" size="sm" onClick={() => downloadReport('asistencias')}>Exportar CSV</Button>
              </div>
              {asistenciasData.length > 0 ? (
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
                <div className="flex items-center justify-center h-[340px] text-muted text-sm">Sin datos de asistencias</div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={cardStyle} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground font-semibold" style={{ fontSize: '15px' }}>Asistencias por hora</h3>
                <Button variant="outline" size="sm" onClick={() => downloadReport('asistencias-por-hora')}>Exportar CSV</Button>
              </div>
              {horasData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={horasData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, 'Asistencias']} />
                    <Bar dataKey="cantidad" fill="#A855F7" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[340px] text-muted text-sm">Sin datos por hora</div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {activeTab === 'pagos' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={cardStyle} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground font-semibold" style={{ fontSize: '15px' }}>Métodos de pago</h3>
                <Button variant="outline" size="sm" onClick={() => downloadReport('metodos-pago')}>Exportar CSV</Button>
              </div>
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
                <div className="flex items-center justify-center h-[200px] text-muted text-sm">Sin datos de pagos</div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={cardStyle} className="p-5">
              <h3 className="text-foreground font-semibold mb-4" style={{ fontSize: '15px' }}>Resumen ejecutivo</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(249,115,22,0.1)' }}>
                    <div className="text-2xl font-bold text-primary">{ingresosData.reduce((s, i) => s + i.total, 0) > 0 ? fmtMoney(ingresosData.reduce((s, i) => s + i.total, 0)) : '₡0'}</div>
                    <div className="text-muted text-xs mt-1">Ingresos totales</div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <div className="text-2xl font-bold text-green-400">{clientesData.reduce((s, c) => s + c.cantidad, 0)}</div>
                    <div className="text-muted text-xs mt-1">Clientes nuevos</div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)' }}>
                    <div className="text-2xl font-bold text-blue-400">{asistenciasData.reduce((s, a) => s + a.cantidad, 0)}</div>
                    <div className="text-muted text-xs mt-1">Asistencias totales</div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(168,85,247,0.1)' }}>
                    <div className="text-2xl font-bold text-purple-400">{distData.reduce((s, d) => s + d.total, 0)}</div>
                    <div className="text-muted text-xs mt-1">Membresías activas</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
