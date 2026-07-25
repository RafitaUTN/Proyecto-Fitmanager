import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface ClienteMembresiaReciente {
  id_cliente_membresia: number
  fecha_inicio: string
  fecha_fin: string
  estado: string
  membresia: { id_membresia: number; nombre: string; precio: number; duracion_dias: number }
  cliente: {
    id_cliente: number
    nombre: string
    apellido: string
    cedula: string
    entrenador: { id_usuario: number; nombre: string; apellido: string } | null
  }
}

interface EstadoData {
  cliente: {
    id_cliente: number; nombre: string; apellido: string; cedula: string
    correo: string | null; telefono: string | null
    fecha_registro: string; estado: boolean
    entrenador: { id_usuario: number; nombre: string; apellido: string; estado: boolean } | null
  }
  membresiaActiva: {
    id: number; idMembresia: number; plan: string; inicio: string; fin: string
    estado: string; diasRestantes: number; progreso: number; precio: number; duracionDias: number
  } | null
  membresiaVencida: {
    id: number; plan: string; inicio: string; fin: string; estado: string
    diasRestantes: number; progreso: number; precio: number; duracionDias: number
  } | null
  historial: {
    id: number; plan: string; precio: number; duracionDias: number
    inicio: string; fin: string; estado: string
  }[]
}

interface ClienteRutina {
  id_cliente_rutina: number
  estado: string
  fecha_asignacion: string
  rutina: { id_rutina: number; nombre: string }
  ejercicios: any[]
}

function cardColor(estado: string, diasRestantes?: number) {
  if (estado === 'cancelada') return 'border-destructive/30'
  if (estado === 'activo' && diasRestantes !== undefined) {
    if (diasRestantes <= 0) return 'border-muted-dark/30'
    if (diasRestantes <= 7) return 'border-yellow-500/30'
    return 'border-secondary/30'
  }
  return 'border-muted-dark/30'
}

function chipEstado(estado: string) {
  switch (estado) {
    case 'activo': return { label: 'Activo', cls: 'bg-secondary/10 text-secondary' }
    case 'cancelada': return { label: 'Cancelada', cls: 'bg-destructive/10 text-destructive' }
    default: return { label: estado, cls: 'bg-muted-dark/10 text-muted-dark' }
  }
}

export function EstadoMembresia() {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState<{ id_cliente: number; nombre: string; apellido: string; cedula: string }[]>([])
  const [clienteSel, setClienteSel] = useState<{ id_cliente: number; nombre: string; apellido: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [estado, setEstado] = useState<EstadoData | null>(null)
  const [error, setError] = useState('')
  const [showHistorial, setShowHistorial] = useState(false)
  const [membresias, setMembresias] = useState<{ id_membresia: number; nombre: string; precio: number }[]>([])
  const [cambiarPlanOpen, setCambiarPlanOpen] = useState(false)
  const [nuevoPlanId, setNuevoPlanId] = useState('')
  const [planesLoading, setPlanesLoading] = useState(false)

  const { data: recientes } = useQuery<ClienteMembresiaReciente[]>({
    queryKey: ['cliente-membresias', 'recientes'],
    queryFn: () => http.get('/clientes-membresias?recientes=true'),
  })

  const { data: rutinasCliente } = useQuery<ClienteRutina[]>({
    queryKey: ['cliente-rutinas', clienteSel?.id_cliente],
    queryFn: () => http.get(`/rutinas/cliente/${clienteSel!.id_cliente}/rutinas`),
    enabled: !!clienteSel && modalOpen,
  })

  const cambiarPlanMutation = useMutation({
    mutationFn: (data: { id_cliente: number; id_membresia: number }) =>
      http.post('/clientes-membresias/cambiar-plan', data),
    onSuccess: () => {
      addToast('Plan cambiado exitosamente', 'success')
      emit(DomainEvents.MEMBRESIA_ASIGNADA)
      queryClient.invalidateQueries({ queryKey: QueryKeys.dashboardAdmin() })
      queryClient.invalidateQueries({ queryKey: ['cliente-membresias', 'recientes'] })
      setCambiarPlanOpen(false)
      setNuevoPlanId('')
      if (clienteSel) consultar(clienteSel.id_cliente)
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  })

  async function buscarSugerencias(q: string) {
    if (q.trim().length < 1) { setSugerencias([]); return }
    try {
      const data = await http.get<{ id_cliente: number; nombre: string; apellido: string; cedula: string }[]>(
        `/clientes?q=${encodeURIComponent(q)}`,
      )
      setSugerencias(data.slice(0, 8))
    } catch { setSugerencias([]) }
  }

  function abrirModal(c: { id_cliente: number; nombre: string; apellido: string; cedula: string }) {
    setClienteSel(c)
    setQuery(`${c.nombre} ${c.apellido} - ${c.cedula}`)
    setSugerencias([])
    consultar(c.id_cliente)
    setModalOpen(true)
    setShowHistorial(false)
  }

  function seleccionarSugerencia(c: { id_cliente: number; nombre: string; apellido: string; cedula: string }) {
    setClienteSel(c)
    setQuery(`${c.nombre} ${c.apellido} - ${c.cedula}`)
    setSugerencias([])
    consultar(c.id_cliente)
    setModalOpen(true)
    setShowHistorial(false)
  }

  async function consultar(idCliente?: number) {
    const id = idCliente || clienteSel?.id_cliente
    if (!id) return
    setLoading(true)
    setError('')
    setEstado(null)
    try {
      const data = await http.get<EstadoData>(`/clientes-membresias/${id}/estado`)
      setEstado(data)
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function abrirCambiarPlan() {
    setPlanesLoading(true)
    try {
      const data = await http.get<{ id_membresia: number; nombre: string; precio: number; estado: boolean }[]>('/membresias')
      setMembresias(data.filter((m) => m.estado !== false))
    } catch {}
    setPlanesLoading(false)
    setNuevoPlanId('')
    setCambiarPlanOpen(true)
  }

  function handleCambiarPlan() {
    if (!clienteSel || !nuevoPlanId) return
    cambiarPlanMutation.mutate({
      id_cliente: clienteSel.id_cliente,
      id_membresia: parseInt(nuevoPlanId),
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl text-foreground tracking-wider">ESTADO MEMBRESÍA</h2>

      {/* Search */}
      <div className="relative flex gap-3">
        <div className="flex-1 relative">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setClienteSel(null); setSugerencias([]); buscarSugerencias(e.target.value) }}
            placeholder="Buscar por nombre, apellido o cédula..."
            className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {sugerencias.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full bg-surface border border-border rounded-card overflow-hidden shadow-xl">
              {sugerencias.map((c) => (
                <button
                  key={c.id_cliente}
                  onClick={() => seleccionarSugerencia(c)}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface-light transition-colors cursor-pointer border-b border-border last:border-0"
                >
                  <span className="font-medium">{c.nombre} {c.apellido}</span>
                  <span className="text-muted ml-2">- {c.cedula}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent assignments table */}
      <div className="bg-surface border border-border rounded-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-light">
            <tr>
              <th className="text-left p-4 text-muted font-medium">Cliente</th>
              <th className="text-left p-4 text-muted font-medium">Membresía</th>
              <th className="text-left p-4 text-muted font-medium">Inicio</th>
              <th className="text-left p-4 text-muted font-medium">Vence</th>
              <th className="text-left p-4 text-muted font-medium">Entrenador</th>
              <th className="text-left p-4 text-muted font-medium">Estado</th>
              <th className="text-left p-4 text-muted font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {recientes?.map((r) => {
              const ch = chipEstado(r.estado)
              return (
                <tr key={r.id_cliente_membresia} className="border-t border-border">
                  <td className="p-4 text-foreground font-medium">{r.cliente.nombre} {r.cliente.apellido}</td>
                  <td className="p-4 text-muted">{r.membresia.nombre}</td>
                  <td className="p-4 text-muted">{new Date(r.fecha_inicio).toLocaleDateString()}</td>
                  <td className="p-4 text-muted">{new Date(r.fecha_fin).toLocaleDateString()}</td>
                  <td className="p-4 text-muted">
                    {r.cliente.entrenador ? `${r.cliente.entrenador.nombre} ${r.cliente.entrenador.apellido}` : '—'}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${ch.cls}`}>{ch.label}</span>
                  </td>
                  <td className="p-4">
                    <Button size="sm" onClick={() => abrirModal(r.cliente)}>Consultar</Button>
                  </td>
                </tr>
              )
            })}
            {(!recientes || recientes.length === 0) && (
              <tr><td colSpan={7} className="p-6 text-center text-muted">Sin asignaciones recientes</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Detalle del cliente */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" onClick={() => setModalOpen(false)}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card p-6 w-full max-w-3xl shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-foreground tracking-wider">DETALLE MEMBRESÍA</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none">&times;</button>
            </div>

            {loading && <p className="text-muted text-sm">Cargando...</p>}
            {error && <p className="text-destructive text-sm">{error}</p>}

            {estado && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Client info */}
                <div className="bg-surface border border-border rounded-card p-4 space-y-2">
                  <h4 className="font-heading text-base text-primary tracking-wider">CLIENTE</h4>
                  <p className="text-base text-foreground font-semibold">{estado.cliente.nombre} {estado.cliente.apellido}</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted">Cédula: <span className="text-foreground">{estado.cliente.cedula}</span></p>
                    {estado.cliente.correo && <p className="text-muted">Correo: <span className="text-foreground">{estado.cliente.correo}</span></p>}
                    {estado.cliente.telefono && <p className="text-muted">Teléfono: <span className="text-foreground">{estado.cliente.telefono}</span></p>}
                    <p className="text-muted">Registro: <span className="text-foreground">{new Date(estado.cliente.fecha_registro).toLocaleDateString()}</span></p>
                    <p className="text-muted">
                      Estado:{' '}
                      <span className={`text-xs px-2 py-0.5 rounded-badge font-medium ${estado.cliente.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                        {estado.cliente.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Trainer info + routines */}
                <div className="bg-surface border border-border rounded-card p-4 space-y-2">
                  <h4 className="font-heading text-base text-primary tracking-wider">ENTRENADOR</h4>
                  {estado.cliente.entrenador ? (
                    <>
                      <p className="text-foreground font-semibold">{estado.cliente.entrenador.nombre} {estado.cliente.entrenador.apellido}</p>
                      <p className="text-muted">
                        Estado:{' '}
                        <span className={`text-xs px-2 py-0.5 rounded-badge font-medium ${estado.cliente.entrenador.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                          {estado.cliente.entrenador.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </p>
                      {rutinasCliente && rutinasCliente.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-dark mb-1.5">RUTINAS ASIGNADAS</p>
                          <div className="space-y-1 max-h-28 overflow-y-auto">
                            {rutinasCliente.map((rc) => (
                              <div key={rc.id_cliente_rutina} className="flex items-center justify-between bg-surface-light rounded px-2.5 py-1.5 border border-border">
                                <span className="text-xs text-foreground">{rc.rutina.nombre}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-badge font-medium ${
                                  rc.estado === 'activa' ? 'bg-secondary/10 text-secondary' : 'bg-muted-dark/10 text-muted-dark'
                                }`}>
                                  {rc.estado === 'activa' ? 'Activa' : rc.estado}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(!rutinasCliente || rutinasCliente.length === 0) && (
                        <p className="text-xs text-muted-dark mt-1">Sin rutinas asignadas</p>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-3 text-muted-dark">
                      <svg className="w-7 h-7 mb-1 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <p className="text-sm">Sin entrenador asignado</p>
                    </div>
                  )}
                </div>

                {/* Membership info */}
                {estado.membresiaActiva ? (
                  <div className={`bg-surface border-2 rounded-card p-4 space-y-2 transition-all ${cardColor('activo', estado.membresiaActiva.diasRestantes)}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-heading text-base tracking-wider" style={{ color: estado.membresiaActiva.diasRestantes <= 7 ? '#eab308' : '#22c55e' }}>MEMBRESÍA</h4>
                      <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${chipEstado(estado.membresiaActiva.estado).cls}`}>
                        {chipEstado(estado.membresiaActiva.estado).label}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{estado.membresiaActiva.plan}</p>
                    <div className="text-sm space-y-1">
                      <p className="text-muted">Precio: <span className="text-foreground font-medium">₡{estado.membresiaActiva.precio.toLocaleString()}</span></p>
                      <p className="text-muted">Duración: <span className="text-foreground">{estado.membresiaActiva.duracionDias} días</span></p>
                      <p className="text-muted">Inicio: <span className="text-foreground">{new Date(estado.membresiaActiva.inicio).toLocaleDateString()}</span></p>
                      <p className="text-muted">Vence: <span className="text-foreground">{new Date(estado.membresiaActiva.fin).toLocaleDateString()}</span></p>
                      <p className="text-muted">Días restantes: <span className={`font-semibold ${estado.membresiaActiva.diasRestantes <= 7 ? 'text-yellow-400' : 'text-foreground'}`}>{estado.membresiaActiva.diasRestantes}</span></p>
                    </div>
                    <ProgressBar current={estado.membresiaActiva.duracionDias - estado.membresiaActiva.diasRestantes} total={estado.membresiaActiva.duracionDias} />
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={abrirCambiarPlan}>Cambiar Plan</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowHistorial(!showHistorial)}>
                        {showHistorial ? 'Ocultar' : 'Historial'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface border border-muted-dark/30 rounded-card p-4 space-y-2">
                    <h4 className="font-heading text-base text-muted-dark tracking-wider">MEMBRESÍA</h4>
                    <p className="text-muted">Sin membresía activa</p>
                    {estado.membresiaVencida && (
                      <p className="text-sm text-destructive">
                        Vencida: {estado.membresiaVencida.plan} — venció el {new Date(estado.membresiaVencida.fin).toLocaleDateString()}
                      </p>
                    )}
                    {estado.historial.length > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setShowHistorial(!showHistorial)}>
                        {showHistorial ? 'Ocultar' : 'Ver historial'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Historial dentro del modal */}
            {showHistorial && estado && estado.historial.length > 0 && (
              <div className="bg-surface-light border border-border rounded-card p-4 space-y-2">
                <h4 className="font-heading text-base text-primary tracking-wider">HISTORIAL</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {estado.historial.map((h) => (
                    <div key={h.id} className="flex items-center justify-between bg-surface rounded-card px-3 py-2 border border-border">
                      <div>
                        <p className="text-sm font-medium text-foreground">{h.plan}</p>
                        <p className="text-xs text-muted">
                          {new Date(h.inicio).toLocaleDateString()} — {new Date(h.fin).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-foreground font-medium">₡{h.precio.toLocaleString()}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-badge font-medium ${chipEstado(h.estado).cls}`}>
                          {chipEstado(h.estado).label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Cambiar Plan */}
      {cambiarPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setCambiarPlanOpen(false)}>
          <div className="fixed inset-0 bg-black/60 pointer-events-none" />
          <div className="relative bg-surface border border-border rounded-card p-6 w-full max-w-md shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl text-foreground tracking-wider">CAMBIAR PLAN</h3>
              <button onClick={() => setCambiarPlanOpen(false)} className="text-muted hover:text-foreground text-xl leading-none cursor-pointer bg-transparent border-none">&times;</button>
            </div>
            {planesLoading ? (
              <p className="text-muted text-sm">Cargando planes...</p>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Cliente: <span className="text-foreground font-medium">{query}</span>
                </p>
                {estado?.membresiaActiva && (
                  <p className="text-sm text-muted">
                    Plan actual: <span className="text-foreground font-medium">{estado.membresiaActiva.plan}</span>
                  </p>
                )}
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Nuevo plan</label>
                  <select value={nuevoPlanId} onChange={(e) => setNuevoPlanId(e.target.value)}
                    className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Seleccionar...</option>
                    {membresias.map((m) => (
                      <option key={m.id_membresia} value={m.id_membresia}>
                        {m.nombre} — ₡{m.precio.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted-dark">
                  Al cambiar de plan, la membresía actual se cancelará y se creará una nueva con el plan seleccionado.
                </p>
                <div className="flex gap-3">
                  <Button onClick={handleCambiarPlan} disabled={!nuevoPlanId || cambiarPlanMutation.isPending} className="flex-1">
                    {cambiarPlanMutation.isPending ? 'Procesando...' : 'Cambiar Plan'}
                  </Button>
                  <Button variant="outline" onClick={() => setCambiarPlanOpen(false)}>Cancelar</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
