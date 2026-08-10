import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAsistencias, useAsistenciasHoy, useAsistenciasActivas, useRegistrarEntrada, useRegistrarSalida, useClientesAsistencia, useClientesElegibles, type AsistenciaFiltros } from '@/hooks/use-asistencias'
import { downloadReport } from '@/lib/download'
import { Clock3, LogOut, UserRoundCheck } from 'lucide-react'

export function Asistencias() {
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [soloDentro, setSoloDentro] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [registroCliente, setRegistroCliente] = useState('')

  const filtros: AsistenciaFiltros = {
    ...(clienteFiltro ? { id_cliente: parseInt(clienteFiltro) } : {}),
    ...(fechaInicio ? { fecha_inicio: fechaInicio } : {}),
    ...(fechaFin ? { fecha_fin: fechaFin } : {}),
    solo_dentro: soloDentro,
    pagina,
    limite: 20,
  }

  const { data: historial } = useAsistencias(filtros)
  const { data: hoy } = useAsistenciasHoy()
  const { data: presentes, isLoading: cargandoPresentes } = useAsistenciasActivas()
  const { data: clientes } = useClientesAsistencia()
  const { data: clientesElegibles, isLoading: cargandoElegibles } = useClientesElegibles()
  const entradaMutation = useRegistrarEntrada(() => { setRegistroCliente('') })
  const salidaMutation = useRegistrarSalida()

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleString('es-CR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function calcDuracion(ingreso: string, salida: string | null) {
    const diff = new Date(salida ?? Date.now()).getTime() - new Date(ingreso).getTime()
    const mins = Math.floor(diff / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m} min`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">ASISTENCIAS</h2>
        <Button variant="outline" onClick={() => downloadReport('asistencias')}>Exportar</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-card p-5">
          <h3 className="font-heading text-xl text-foreground tracking-wider mb-4">REGISTRAR ENTRADA</h3>
          <div className="flex gap-3">
            <select value={registroCliente} onChange={(e) => setRegistroCliente(e.target.value)}
              className="flex-1 rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Seleccionar cliente...</option>
              {clientesElegibles?.map((c: any) => (
                <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido} - {c.cedula}</option>
              ))}
            </select>
            <Button onClick={() => entradaMutation.mutate({ id_cliente: parseInt(registroCliente) })} disabled={!registroCliente || entradaMutation.isPending}>
              Entrada
            </Button>
          </div>
          {!cargandoElegibles && clientesElegibles?.length === 0 && (
            <p className="text-xs text-muted-dark mt-2">No hay clientes elegibles: solo se listan clientes activos con membresía vigente y sin entrada abierta.</p>
          )}
        </div>

        <div className="bg-surface border border-border rounded-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-heading text-xl text-foreground tracking-wider">REGISTRAR SALIDA</h3>
            <span className="text-xs rounded-full bg-green-500/10 text-green-400 px-2.5 py-1">{presentes?.length ?? 0} dentro</span>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {cargandoPresentes && <div className="h-24 rounded-card bg-surface-light animate-pulse" />}
            {presentes?.map((asistencia) => (
              <article key={asistencia.id_asistencia} className="rounded-card border border-border bg-surface-light/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-foreground font-semibold"><UserRoundCheck size={16} className="text-green-400 shrink-0" aria-hidden="true" />{asistencia.cliente.nombre} {asistencia.cliente.apellido}</p>
                    <p className="text-xs text-muted mt-2">Entrada: {formatFecha(asistencia.fecha_hora_ingreso)}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-dark mt-1"><Clock3 size={13} aria-hidden="true" />En gimnasio: {calcDuracion(asistencia.fecha_hora_ingreso, null)}</p>
                  </div>
                  <Button size="sm" onClick={() => salidaMutation.mutate(asistencia.id_asistencia)} disabled={salidaMutation.isPending} aria-label={`Registrar salida de ${asistencia.cliente.nombre} ${asistencia.cliente.apellido}`}>
                    <LogOut size={15} aria-hidden="true" /> Salida
                  </Button>
                </div>
              </article>
            ))}
            {!cargandoPresentes && presentes?.length === 0 && <p className="text-sm text-muted-dark py-6 text-center">No hay clientes dentro del gimnasio.</p>}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-card p-5">
        <h3 className="font-heading text-xl text-foreground tracking-wider mb-4">HOY</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th className="text-left p-3 text-muted font-medium">Cliente</th>
                <th className="text-left p-3 text-muted font-medium">Entrada</th>
                <th className="text-left p-3 text-muted font-medium">Salida</th>
                <th className="text-left p-3 text-muted font-medium">Duración</th>
                <th className="text-left p-3 text-muted font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {hoy?.map((a) => (
                <tr key={a.id_asistencia} className="border-t border-border">
                  <td className="p-3 text-foreground font-medium">{a.cliente.nombre} {a.cliente.apellido}</td>
                  <td className="p-3 text-muted">{formatFecha(a.fecha_hora_ingreso)}</td>
                  <td className="p-3 text-muted">{a.fecha_hora_salida ? formatFecha(a.fecha_hora_salida) : '—'}</td>
                  <td className="p-3 text-muted">{calcDuracion(a.fecha_hora_ingreso, a.fecha_hora_salida)}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${
                      a.fecha_hora_salida ? 'bg-muted/10 text-muted-dark' : 'bg-green-500/10 text-green-400'
                    }`}>
                      {a.fecha_hora_salida ? 'Completado' : 'En gimnasio'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!hoy || hoy.length === 0) && (
                <tr><td colSpan={5} className="p-6 text-center text-muted">Sin registros hoy</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-card p-5">
        <h3 className="font-heading text-xl text-foreground tracking-wider mb-4">HISTORIAL</h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs text-muted-dark mb-1">Cliente</label>
            <select value={clienteFiltro} onChange={(e) => { setClienteFiltro(e.target.value); setPagina(1) }}
              className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Todos</option>
              {clientes?.map((c: any) => (
                <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-dark mb-1">Fecha inicio</label>
            <input type="date" value={fechaInicio} onChange={(e) => { setFechaInicio(e.target.value); setPagina(1) }}
              className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs text-muted-dark mb-1">Fecha fin</label>
            <input type="date" value={fechaFin} onChange={(e) => { setFechaFin(e.target.value); setPagina(1) }}
              className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={soloDentro} onChange={(e) => { setSoloDentro(e.target.checked); setPagina(1) }}
                className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-ring" />
              <span className="text-sm text-muted">Solo dentro</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th className="text-left p-3 text-muted font-medium">Cliente</th>
                <th className="text-left p-3 text-muted font-medium">Entrada</th>
                <th className="text-left p-3 text-muted font-medium">Salida</th>
                <th className="text-left p-3 text-muted font-medium">Duración</th>
                <th className="text-left p-3 text-muted font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {historial?.data?.map((a) => (
                <tr key={a.id_asistencia} className="border-t border-border">
                  <td className="p-3 text-foreground font-medium">{a.cliente.nombre} {a.cliente.apellido}</td>
                  <td className="p-3 text-muted">{formatFecha(a.fecha_hora_ingreso)}</td>
                  <td className="p-3 text-muted">{a.fecha_hora_salida ? formatFecha(a.fecha_hora_salida) : '—'}</td>
                  <td className="p-3 text-muted">{calcDuracion(a.fecha_hora_ingreso, a.fecha_hora_salida)}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${
                      a.fecha_hora_salida ? 'bg-muted/10 text-muted-dark' : 'bg-green-500/10 text-green-400'
                    }`}>
                      {a.fecha_hora_salida ? 'Completado' : 'En gimnasio'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!historial || historial.data?.length === 0) && (
                <tr><td colSpan={5} className="p-6 text-center text-muted">Sin registros</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {historial && historial.totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1}
              className="text-xs px-3 py-1.5 rounded-button bg-surface-light text-muted hover:text-foreground transition-colors cursor-pointer border border-border disabled:opacity-50 disabled:cursor-not-allowed">
              Anterior
            </button>
            <span className="text-xs text-muted-dark">Pág. {pagina} de {historial.totalPaginas}</span>
            <button onClick={() => setPagina((p) => Math.min(historial.totalPaginas, p + 1))} disabled={pagina >= historial.totalPaginas}
              className="text-xs px-3 py-1.5 rounded-button bg-surface-light text-muted hover:text-foreground transition-colors cursor-pointer border border-border disabled:opacity-50 disabled:cursor-not-allowed">
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
