import { useState } from 'react'
import { http } from '@/lib/http-client'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface EstadoData {
  cliente: {
    id_cliente: number; nombre: string; apellido: string; cedula: string
    correo: string | null; telefono: string | null
    fecha_registro: string; estado: boolean
  }
  membresiaActiva: {
    id: number; plan: string; inicio: string; fin: string; estado: string
    diasRestantes: number; progreso: number; precio: number; duracionDias: number
  } | null
  membresiaVencida: {
    id: number; plan: string; inicio: string; fin: string; estado: string
    diasRestantes: number; progreso: number; precio: number; duracionDias: number
  } | null
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
  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState<{ id_cliente: number; nombre: string; apellido: string; cedula: string }[]>([])
  const [clienteSel, setClienteSel] = useState<{ id_cliente: number } | null>(null)
  const [estado, setEstado] = useState<EstadoData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>
              <ProgressBar current={estado.membresiaActiva.duracionDias - estado.membresiaActiva.diasRestantes} total={estado.membresiaActiva.duracionDias} />
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}
