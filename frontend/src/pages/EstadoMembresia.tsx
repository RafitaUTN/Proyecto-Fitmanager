import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'
import { emit, DomainEvents } from '@/lib/events'
import { QueryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'

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
  const [clienteSel, setClienteSel] = useState<{ id_cliente: number } | null>(null)
  const [estado, setEstado] = useState<EstadoData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHistorial, setShowHistorial] = useState(false)
  const [membresias, setMembresias] = useState<{ id_membresia: number; nombre: string; precio: number }[]>([])
  const [cambiarPlanOpen, setCambiarPlanOpen] = useState(false)
  const [nuevoPlanId, setNuevoPlanId] = useState('')
  const [planesLoading, setPlanesLoading] = useState(false)

  const cambiarPlanMutation = useMutation({
    mutationFn: (data: { id_cliente: number; id_membresia: number }) =>
      http.post('/clientes-membresias/cambiar-plan', data),
    onSuccess: () => {
      addToast('Plan cambiado exitosamente', 'success')
      emit(DomainEvents.MEMBRESIA_ASIGNADA)
      queryClient.invalidateQueries({ queryKey: QueryKeys.dashboardAdmin() })
      setCambiarPlanOpen(false)
      setNuevoPlanId('')
      if (clienteSel) consultar(clienteSel.id_cliente)
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })

  async function buscarSugerencias(q: string) {
    if (q.trim().length < 1) { setSugerencias([]); return }
    try {
      const data = await http.get<{ id_cliente: number; nombre: string; apellido: string; cedula: string }[]>(
        `/clientes?q=${encodeURIComponent(q)}`,
      )
      setSugerencias(data.slice(0, 8))
    } catch {
      setSugerencias([])
    }
  }

  function seleccionar(c: { id_cliente: number; nombre: string; apellido: string; cedula: string }) {
    setClienteSel(c)
    setQuery(`${c.nombre} ${c.apellido} - ${c.cedula}`)
    setSugerencias([])
    consultar(c.id_cliente)
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

      <div className="relative flex gap-3">
        <div className="flex-1 relative">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setClienteSel(null); setEstado(null); buscarSugerencias(e.target.value) }}
            placeholder="Buscar por nombre, apellido o cédula..."
            className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {sugerencias.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full bg-surface border border-border rounded-card overflow-hidden shadow-xl">
              {sugerencias.map((c) => (
                <button
                  key={c.id_cliente}
                  onClick={() => seleccionar(c)}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface-light transition-colors cursor-pointer border-b border-border last:border-0"
                >
                  <span className="font-medium">{c.nombre} {c.apellido}</span>
                  <span className="text-muted ml-2">- {c.cedula}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button onClick={() => consultar()} disabled={loading}>Consultar</Button>
      </div>

      {loading && <p className="text-muted text-sm">Consultando...</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}

      {estado && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-border rounded-card p-5 space-y-3">
              <h3 className="font-heading text-xl text-primary tracking-wider">CLIENTE</h3>
              <p className="text-lg text-foreground font-semibold">{estado.cliente.nombre} {estado.cliente.apellido}</p>
              <div className="space-y-1.5 text-sm">
                <p className="text-muted">Cédula: <span className="text-foreground">{estado.cliente.cedula}</span></p>
                {estado.cliente.correo && <p className="text-muted">Correo: <span className="text-foreground">{estado.cliente.correo}</span></p>}
                {estado.cliente.telefono && <p className="text-muted">Teléfono: <span className="text-foreground">{estado.cliente.telefono}</span></p>}
                <p className="text-muted">Registro: <span className="text-foreground">{new Date(estado.cliente.fecha_registro).toLocaleDateString()}</span></p>
                <p className="text-muted">Estado: <span className={`text-xs px-2 py-0.5 rounded-badge font-medium ${estado.cliente.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>{estado.cliente.estado ? 'Activo' : 'Inactivo'}</span></p>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-card p-5 space-y-3">
              <h3 className="font-heading text-xl text-primary tracking-wider">ENTRENADOR</h3>
              {estado.cliente.entrenador ? (
                <div className="space-y-1.5 text-sm">
                  <p className="text-foreground font-semibold">{estado.cliente.entrenador.nombre} {estado.cliente.entrenador.apellido}</p>
                  <p className="text-muted">Estado: <span className={`text-xs px-2 py-0.5 rounded-badge font-medium ${estado.cliente.entrenador.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                    {estado.cliente.entrenador.estado ? 'Activo' : 'Inactivo'}
                  </span></p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-muted-dark">
                  <svg className="w-8 h-8 mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <p className="text-sm">Sin entrenador asignado</p>
                </div>
              )}
            </div>

            {estado.membresiaActiva ? (
              <div className={`bg-surface border-2 rounded-card p-5 space-y-3 transition-all ${cardColor('activo', estado.membresiaActiva.diasRestantes)}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-xl tracking-wider" style={{ color: estado.membresiaActiva.diasRestantes <= 7 ? '#eab308' : '#22c55e' }}>MEMBRESÍA</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-badge font-medium ${chipEstado(estado.membresiaActiva.estado).cls}`}>
                    {chipEstado(estado.membresiaActiva.estado).label}
                  </span>
                </div>
                <p className="text-xl font-bold text-foreground">{estado.membresiaActiva.plan}</p>
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
              <div className="bg-surface border border-muted-dark/30 rounded-card p-5 space-y-3">
                <h3 className="font-heading text-xl text-muted-dark tracking-wider">MEMBRESÍA</h3>
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

          {showHistorial && estado.historial.length > 0 && (
            <div className="bg-surface border border-border rounded-card p-5 space-y-3">
              <h3 className="font-heading text-xl text-primary tracking-wider">HISTORIAL</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {estado.historial.map((h) => (
                  <div key={h.id} className="flex items-center justify-between bg-surface-light rounded-card px-4 py-3 border border-border">
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
        </>
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
