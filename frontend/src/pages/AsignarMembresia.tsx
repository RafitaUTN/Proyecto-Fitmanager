import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface Cliente { id_cliente: number; nombre: string; apellido: string; cedula: string }
interface Membresia { id_membresia: number; nombre: string; precio: number; duracion_dias: number; estado: boolean }

interface MembresiaInfo {
  id: number; idMembresia: number; plan: string; precio: number
  duracionDias: number; inicio: string; fin: string; estado: string
  diasRestantes: number; progreso: number
}

interface EstadoData {
  cliente: { id_cliente: number; nombre: string; apellido: string; cedula: string }
  membresiaActiva: MembresiaInfo | null
}

interface HistorialItem {
  id_cliente_membresia: number
  id_cliente: number
  fecha_inicio: string
  fecha_fin: string
  estado: string
  membresia: { nombre: string; precio: number; duracion_dias: number }
}

const asignarSchema = z.object({
  id_cliente: z.string().min(1, 'Seleccione un cliente'),
  id_membresia: z.string().min(1, 'Seleccione un plan'),
  fecha_inicio: z.string().min(1, 'Seleccione una fecha'),
})

type AsignarForm = z.infer<typeof asignarSchema>

export function AsignarMembresia() {
  const token = useAuthStore((s) => s.token)
  const [membresias, setMembresias] = useState<Membresia[]>([])

  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState<Cliente[]>([])
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null)
  const [estado, setEstado] = useState<EstadoData | null>(null)
  const [error, setError] = useState('')

  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [showHistorial, setShowHistorial] = useState(false)
  const [historialLoading, setHistorialLoading] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState<'cancelar' | 'renovar' | null>(null)
  const [accionLoading, setAccionLoading] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<AsignarForm>({
    resolver: zodResolver(asignarSchema),
  })

  useEffect(() => {
    fetch(`${API_URL}/membresias`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok && r.json()).then(setMembresias)
  }, [])

  async function buscarClientes(q: string) {
    if (q.trim().length < 1) { setSugerencias([]); return }
    const res = await fetch(`${API_URL}/clientes?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setSugerencias(data.slice(0, 8))
    }
  }

  async function fetchEstado(idCliente: number) {
    const res = await fetch(`${API_URL}/clientes-membresias/${idCliente}/estado`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setEstado({ cliente: data.cliente, membresiaActiva: data.membresiaActiva })
    } else {
      setEstado(null)
    }
  }

  function seleccionar(c: Cliente) {
    setClienteSel(c)
    setQuery(`${c.nombre} ${c.apellido} - ${c.cedula}`)
    setSugerencias([])
    setError('')
    setValue('id_cliente', String(c.id_cliente), { shouldValidate: true, shouldDirty: true, shouldTouch: true })
    fetchEstado(c.id_cliente)
  }

  async function abrirHistorial() {
    if (!clienteSel) return
    setHistorialLoading(true)
    setShowHistorial(true)
    const res = await fetch(`${API_URL}/clientes-membresias?id_cliente=${clienteSel.id_cliente}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setHistorial(await res.json())
    setHistorialLoading(false)
  }

  async function onSubmit(data: AsignarForm) {
    setError('')
    const body = { id_cliente: parseInt(data.id_cliente), id_membresia: parseInt(data.id_membresia), fecha_inicio: data.fecha_inicio }
    const res = await fetch(`${API_URL}/clientes-membresias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const clientePreservado = clienteSel
      reset({ id_cliente: String(clientePreservado!.id_cliente), id_membresia: '', fecha_inicio: '' })
      setValue('id_cliente', String(clientePreservado!.id_cliente), { shouldValidate: true })
      if (clientePreservado) fetchEstado(clientePreservado.id_cliente)
    } else {
      const err = await res.json().catch(() => ({ error: 'Error al asignar' }))
      setError(err.error || `Error ${res.status}`)
    }
  }

  async function ejecutarRenovar() {
    if (!estado?.membresiaActiva) return
    setAccionLoading(true)
    const res = await fetch(`${API_URL}/clientes-membresias/${estado.membresiaActiva.id}/renovar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al renovar' }))
      setError(err.error)
    } else if (clienteSel) {
      fetchEstado(clienteSel.id_cliente)
    }
    setAccionLoading(false)
    setConfirmOpen(null)
  }

  async function ejecutarCancelar() {
    if (!estado?.membresiaActiva) return
    setAccionLoading(true)
    const res = await fetch(`${API_URL}/clientes-membresias/${estado.membresiaActiva.id}/cancelar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al cancelar' }))
      setError(err.error)
    } else if (clienteSel) {
      fetchEstado(clienteSel.id_cliente)
    }
    setAccionLoading(false)
    setConfirmOpen(null)
  }

  function chipEstado(estado: string) {
    switch (estado) {
      case 'activo': return <span className="text-xs px-2.5 py-1 rounded-badge font-medium bg-secondary/10 text-secondary">Activo</span>
      case 'cancelada': return <span className="text-xs px-2.5 py-1 rounded-badge font-medium bg-destructive/10 text-destructive">Cancelada</span>
      default: return <span className="text-xs px-2.5 py-1 rounded-badge font-medium bg-muted-dark/10 text-muted-dark">{estado}</span>
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl text-foreground tracking-wider">ASIGNAR MEMBRESÍA</h2>

      {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center px-4 py-2 rounded-button">{error}</div>}

      {/* BLOQUE 1: FORMULARIO */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-surface border border-border rounded-card p-6 space-y-5">
        <h3 className="font-heading text-xl text-primary tracking-wider">NUEVA ASIGNACIÓN</h3>

        <div className="relative">
          <label className="block text-sm font-medium text-muted mb-1.5">Cliente</label>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setClienteSel(null); setEstado(null); setValue('id_cliente', '', { shouldValidate: true }); buscarClientes(e.target.value) }}
            placeholder="Buscar por nombre, apellido o cédula..."
            className="w-full rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input type="hidden" {...register('id_cliente')} />
          {errors.id_cliente && <p className="text-destructive text-xs mt-1">{errors.id_cliente.message}</p>}
          {sugerencias.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full bg-surface border border-border rounded-card overflow-hidden shadow-xl">
              {sugerencias.map((c) => (
                <button
                  key={c.id_cliente}
                  type="button"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Plan</label>
            <select {...register('id_membresia')} className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Seleccionar...</option>
              {membresias.filter(m => m.estado !== false).map((m) => (
                <option key={m.id_membresia} value={m.id_membresia}>{m.nombre} - ₡{Number(m.precio).toLocaleString()}</option>
              ))}
            </select>
            {errors.id_membresia && <p className="text-destructive text-xs mt-1">{errors.id_membresia.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Fecha de Inicio</label>
            <input type="date" {...register('fecha_inicio')}
              className="w-full rounded-input border border-border bg-surface text-foreground px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {errors.fecha_inicio && <p className="text-destructive text-xs mt-1">{errors.fecha_inicio.message}</p>}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} size="lg" className="w-full sm:w-auto">Asignar Membresía</Button>
      </form>

      {/* BLOQUE 2 + 3: ESTADO ACTUAL + ACCIONES */}
      {clienteSel && (
        <div className="bg-surface border border-border rounded-card overflow-hidden">
          {estado?.membresiaActiva ? (
            <div className="divide-y divide-border">
              <div className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-xl text-foreground tracking-wider">MEMBRESÍA ACTIVA</h3>
                  {chipEstado(estado.membresiaActiva.estado)}
                </div>
                <p className="text-lg text-foreground font-semibold">{estado.membresiaActiva.plan}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-muted">Inicio</p><p className="text-foreground font-medium">{new Date(estado.membresiaActiva.inicio).toLocaleDateString()}</p></div>
                  <div><p className="text-muted">Vence</p><p className="text-foreground font-medium">{new Date(estado.membresiaActiva.fin).toLocaleDateString()}</p></div>
                  <div><p className="text-muted">Días rest.</p><p className="text-foreground font-medium">{estado.membresiaActiva.diasRestantes}</p></div>
                  <div><p className="text-muted">Precio</p><p className="text-foreground font-medium">₡{estado.membresiaActiva.precio.toLocaleString()}</p></div>
                </div>
                <ProgressBar
                  current={estado.membresiaActiva.duracionDias - estado.membresiaActiva.diasRestantes}
                  total={estado.membresiaActiva.duracionDias}
                />
              </div>
              <div className="p-5 sm:p-6 flex flex-wrap gap-3">
                <Button onClick={() => setConfirmOpen('renovar')} size="sm">
                  Renovar
                </Button>
                <Button onClick={() => setConfirmOpen('cancelar')} variant="outline" size="sm" className="text-destructive! border-destructive/30! hover:bg-destructive/10!">
                  Cancelar
                </Button>
                <Button onClick={abrirHistorial} variant="ghost" size="sm">Ver historial</Button>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6 space-y-2">
              <h3 className="font-heading text-xl text-muted-dark tracking-wider">MEMBRESÍA</h3>
              <p className="text-sm text-muted">Este cliente no tiene una membresía activa.</p>
              <p className="text-sm text-muted">Use el formulario superior para asignar una nueva.</p>
              <Button onClick={abrirHistorial} variant="ghost" size="sm">Ver historial</Button>
            </div>
          )}
        </div>
      )}

      {/* BLOQUE 4: HISTORIAL (DRAWER) */}
      {showHistorial && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowHistorial(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-surface border-l border-border shadow-2xl overflow-y-auto">
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-2xl text-foreground tracking-wider">HISTORIAL</h3>
                <button onClick={() => setShowHistorial(false)} className="text-muted hover:text-foreground text-2xl leading-none cursor-pointer">&times;</button>
              </div>

              {historialLoading ? (
                <p className="text-muted text-sm">Cargando...</p>
              ) : historial.length === 0 ? (
                <p className="text-muted text-sm">Sin registros</p>
              ) : (
                <div className="space-y-3">
                  {historial.map((h) => (
                    <div key={h.id_cliente_membresia} className="bg-surface-light rounded-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-foreground text-sm">{h.membresia.nombre}</p>
                        {chipEstado(h.estado)}
                      </div>
                      <p className="text-xs text-muted">₡{Number(h.membresia.precio).toLocaleString()} · {h.membresia.duracion_dias} días</p>
                      <div className="text-xs text-muted space-y-0.5">
                        <p>Inicio: {new Date(h.fecha_inicio).toLocaleDateString()}</p>
                        <p>Fin: {new Date(h.fecha_fin).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* CONFIRM MODALS */}
      <ConfirmModal
        open={confirmOpen === 'renovar'}
        title="Renovar membresía"
        message="Se creará una nueva membresía a partir de la fecha de vencimiento actual. ¿Desea continuar?"
        confirmText="Renovar"
        variant="primary"
        onConfirm={ejecutarRenovar}
        onCancel={() => setConfirmOpen(null)}
        loading={accionLoading}
      />
      <ConfirmModal
        open={confirmOpen === 'cancelar'}
        title="Cancelar membresía"
        message="Esta acción conservará el historial. ¿Está seguro?"
        confirmText="Cancelar membresía"
        variant="danger"
        onConfirm={ejecutarCancelar}
        onCancel={() => setConfirmOpen(null)}
        loading={accionLoading}
      />
    </div>
  )
}
