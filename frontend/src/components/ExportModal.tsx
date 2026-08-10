import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import { Button } from './ui/Button'
import { downloadReport } from '@/lib/download'
import { PUBLIC_API_URL } from '@/config/public-api'

const periodos = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Mes actual' },
  { id: 'mes-anterior', label: 'Mes anterior' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: '90d', label: 'Últimos 90 días' },
  { id: 'anio', label: 'Año actual' },
  { id: 'anio-anterior', label: 'Año anterior' },
  { id: 'personalizado', label: 'Personalizado' },
]

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
    case 'mes-anterior':
      return { fecha_inicio: fmt(new Date(y, m - 1, 1)), fecha_fin: fmt(new Date(y, m, 0)) }
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
    case 'anio-anterior':
      return { fecha_inicio: fmt(new Date(y - 1, 0, 1)), fecha_fin: fmt(new Date(y - 1, 11, 31)) }
    default:
      return {}
  }
}

interface ExportModalProps {
  open: boolean
  onClose: () => void
  moduloActual?: string
  filtrosActuales?: { fecha_inicio?: string; fecha_fin?: string }
}

export function ExportModal({ open, onClose, moduloActual }: ExportModalProps) {
  const [tipo, setTipo] = useState<'general' | 'modulo'>('modulo')
  const [periodo, setPeriodo] = useState('mes')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [incluirGraficos, setIncluirGraficos] = useState(true)
  const [formato, setFormato] = useState<'csv' | 'pdf' | 'xlsx'>('xlsx')
  const [exportando, setExportando] = useState(false)

  function getMapTipo() {
    const mapTipo: Record<string, string> = {
      ingresos: 'ingresos-mensuales',
      clientes: 'nuevos-clientes',
      membresias: 'distribucion-membresias',
      asistencias: 'asistencias',
      pagos: 'metodos-pago',
    }
    return mapTipo[moduloActual || ''] || 'ingresos-mensuales'
  }

  async function handleExport() {
    const rango = periodo === 'personalizado' ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin } : calcularRango(periodo)

    if (formato === 'csv' || !incluirGraficos) {
      if (tipo === 'general') {
        downloadReport('ingresos-mensuales', rango.fecha_inicio, rango.fecha_fin, formato)
      } else {
        downloadReport(getMapTipo(), rango.fecha_inicio, rango.fecha_fin, formato)
      }
      onClose()
      return
    }

    setExportando(true)
    try {
      const chartEls = document.querySelectorAll<HTMLElement>('[data-chart="true"]')
      const graficos: string[] = []
      for (const el of chartEls) {
        try {
          const dataUrl = await toPng(el, { quality: 0.85, backgroundColor: '#141414' })
          graficos.push(dataUrl)
        } catch { }
      }

      const tipoReporte = tipo === 'general' ? 'ingresos-mensuales' : getMapTipo()
      const body: Record<string, unknown> = {
        tipo: tipoReporte,
        formato,
        graficos,
      }
      if (rango.fecha_inicio) body.fecha_inicio = rango.fecha_inicio
      if (rango.fecha_fin) body.fecha_fin = rango.fecha_fin

      const { useAuthStore } = await import('@/store/auth.store')
      const token = useAuthStore.getState().token
      const gym = useAuthStore.getState().usuario?.nombre_gimnasio || ''
      const res = await fetch(`${PUBLIC_API_URL}/reportes/exportar-con-graficos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ ...body, nombre_gimnasio: gym }),
      })

      if (!res.ok) throw new Error('Error al exportar')
      const blob = await res.blob()
      const ext = formato === 'pdf' ? 'pdf' : formato === 'xlsx' ? 'xlsx' : 'csv'
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.setAttribute('download', `${tipoReporte}-${new Date().toISOString().split('T')[0]}.${ext}`)
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      downloadReport(tipo === 'general' ? 'ingresos-mensuales' : getMapTipo(), rango.fecha_inicio, rango.fecha_fin, formato)
    }
    setExportando(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="relative bg-surface border border-border rounded-card p-6 w-full max-w-lg shadow-xl cursor-default"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-6">Exportar reporte</h3>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-muted block mb-2">Tipo de exportación</label>
                <div className="flex gap-3">
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${tipo === 'modulo' ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    <input type="radio" name="tipo" checked={tipo === 'modulo'} onChange={() => setTipo('modulo')} className="accent-primary" />
                    <span className="text-sm text-foreground">Módulo actual</span>
                  </label>
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${tipo === 'general' ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    <input type="radio" name="tipo" checked={tipo === 'general'} onChange={() => setTipo('general')} className="accent-primary" />
                    <span className="text-sm text-foreground">Reporte general</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted block mb-2">Período</label>
                <div className="grid grid-cols-3 gap-2">
                  {periodos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPeriodo(p.id)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors cursor-pointer ${
                        periodo === p.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:text-foreground'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {periodo === 'personalizado' && (
                  <div className="flex gap-3 mt-3">
                    <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                      className="flex-1 rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                      className="flex-1 rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                )}
              </div>

              {formato !== 'csv' && (
                <div>
                  <label className="text-sm text-muted block mb-2">Contenido</label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={incluirGraficos} onChange={(e) => setIncluirGraficos(e.target.checked)} className="accent-primary" />
                    <span className="text-sm text-foreground">Incluir gráficos</span>
                  </label>
                </div>
              )}

              <div>
                <label className="text-sm text-muted block mb-2">Formato</label>
                <div className="flex gap-3">
                  {([{ id: 'csv', label: 'CSV' }, { id: 'xlsx', label: 'Excel' }, { id: 'pdf', label: 'PDF' }] as const).map((f) => (
                    <label key={f.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${formato === f.id ? 'border-primary bg-primary/10' : 'border-border'}`}>
                      <input type="radio" name="formato" checked={formato === f.id} onChange={() => setFormato(f.id)} className="accent-primary" />
                      <span className="text-sm text-foreground uppercase">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <Button variant="outline" onClick={onClose} disabled={exportando}>Cancelar</Button>
              <Button onClick={handleExport} disabled={exportando}>{exportando ? 'Exportando...' : 'Exportar'}</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
