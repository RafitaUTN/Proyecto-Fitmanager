import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { http } from '@/lib/http-client'
import { useToast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface Cliente { id_cliente: number; nombre: string; apellido: string; cedula: string }

interface EntrenadorDisponible {
  id_entrenador: number
  nombre: string
  correo: string
  capacidad_max: number
  clientes_asignados: number
  disponible: boolean
  espacios_restantes: number
}

interface HistorialItem {
  id_cliente_membresia: number
  id_cliente: number
  fecha_inicio: string
  fecha_fin: string
  estado: string
  membresia: { nombre: string; precio: number; duracion_dias: number }
}

interface EstadoData {
  cliente: { id_cliente: number; nombre: string; apellido: string; cedula: string }
  membresiaActiva: {
    id: number; idMembresia: number; plan: string; precio: number
    duracionDias: number; inicio: string; fin: string; estado: string
    diasRestantes: number; progreso: number
  } | null
}

const asignarSchema = z.object({
  id_cliente: z.string().min(1, 'Seleccione un cliente'),
  id_membresia: z.string().min(1, 'Seleccione un plan'),
  fecha_inicio: z.string().min(1, 'Seleccione una fecha'),
  id_entrenador: z.string().optional(),
})

type AsignarForm = z.infer<typeof asignarSchema>

export function AsignarMembresia() {
  const token = useAuthStore((s) => s.token)
  const { addToast } = useToast()

  const [membresias, setMembresias] = useState<{ id_membresia: number; nombre: string; precio: number; estado: boolean }[]>([])
  const [entrenadores, setEntrenadores] = useState<EntrenadorDisponible[]>([])
  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState<Cliente[]>([])
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null)
  const [estado, setEstado] = useState<EstadoData | null>(null)
  const [error, setError] = useState('')
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [showHistorial, setShowHistorial] = useState(false)
  const [historialLoading, setHistorialLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState<'cancelar' | 'renovar' | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<AsignarForm>({
    resolver: zodResolver(asignarSchema),
  })
  const watchIdEntrenador = watch('id_entrenador')

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    fetch(`${API_URL}/membresias`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok && r.json()).then(setMembresias)
    fetch(`${API_URL}/entrenadores/disponibles`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok && r.json()).then(setEntrenadores)
  }, [token])

  const buscarClientes = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setSugerencias([]); return }
    try {
      const data = await http.get<Cliente[]>(`/clientes?q=${encodeURIComponent(q)}`)
      setSugerencias(data.slice(0, 8))
    } catch { setSugerencias([]) }
  }, [])

  const fetchEstado = useCallback(async (idCliente: number) => {
    try {
      const data = await http.get<EstadoData>(`/clientes-membresias/${idCliente}/estado`)
      setEstado(data)
    } catch {
      setEstado(null)
    }
  }, [])

  function seleccionar(c: Cliente) {
    setClienteSel(c)
    setQuery(`${c.nombre} ${c.apellido} - ${c.cedula}`)
    setSugerencias([])
    setError('')
    setValue('id_cliente', String(c.id_cliente), { shouldValidate: true })
    fetchEstado(c.id_cliente)
  }

  async function abrirHistorial() {
    if (!clienteSel) return
    setHistorialLoading(true)
    setShowHistorial(true)
    try {
      const data = await http.get<HistorialItem[]>(`/clientes-membresias?id_cliente=${clienteSel.id_cliente}`)
      setHistorial(data)
    } catch {
      setHistorial([])
    }
    setHistorialLoading(false)
  }

  const asignarMutation = useMutation({
    mutationFn: (data: { id_cliente: number; id_membresia: number; fecha_inicio: string }) =>
      http.post('/clientes-membresias', data),
    onSuccess: () => {
      addToast('Membresía asignada exitosamente', 'success')
      if (clienteSel) fetchEstado(clienteSel.id_cliente)
      reset({ id_cliente: String(clienteSel!.id_cliente), id_membresia: '', fecha_inicio: '' })
      setValue('id_cliente', String(clienteSel!.id_cliente), { shouldValidate: true })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const renovarMutation = useMutation({
    mutationFn: (id: number) => http.post(`/clientes-membresias/${id}/renovar`),
    onSuccess: () => {
      addToast('Membresía renovada', 'success')
      if (clienteSel) fetchEstado(clienteSel.id_cliente)
    },
    onError: (err: Error) => { setError(err.message) },
    onSettled: () => { setConfirmOpen(null) },
  })

  const cancelarMutation = useMutation({
    mutationFn: (id: number) => http.post(`/clientes-membresias/${id}/cancelar`),
    onSuccess: () => {
      addToast('Membresía cancelada', 'success')
      if (clienteSel) fetchEstado(clienteSel.id_cliente)
    },
    onError: (err: Error) => { setError(err.message) },
    onSettled: () => { setConfirmOpen(null) },
  })

  async function onSubmit(data: AsignarForm) {
    setError('')
    const body: any = {
      id_cliente: parseInt(data.id_cliente),
      id_membresia: parseInt(data.id_membresia),
      fecha_inicio: data.fecha_inicio,
    }
    if (data.id_entrenador) {
      body.id_entrenador = parseInt(data.id_entrenador)
    }
    asignarMutation.mutate(body)
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

        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Entrenador responsable (opcional)</label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {entrenadores.length === 0 && (
              <p className="text-sm text-muted-dark">No hay entrenadores disponibles</p>
            )}
            {entrenadores.map((e) => {
              const selected = watchIdEntrenador === String(e.id_entrenador)
              const full = !e.disponible
              return (
                <label
                  key={e.id_entrenador}
                  className={`flex items-center gap-3 p-3 rounded-card border cursor-pointer transition-all ${
                    selected
                      ? 'bg-primary/10 border-primary'
                      : full
                        ? 'bg-surface border-border opacity-60'
                        : 'bg-surface border-border hover:border-primary/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="id_entrenador"
                    value={String(e.id_entrenador)}
                    checked={selected}
                    disabled={full}
                    onChange={() => setValue('id_entrenador', String(e.id_entrenador), { shouldValidate: true })}
                    className="accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{e.nombre}</p>
                      {full ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-badge font-medium bg-destructive/10 text-destructive">Completo</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-badge font-medium bg-secondary/10 text-secondary">Disponible</span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{e.clientes_asignados}/{e.capacidad_max} clientes</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting || asignarMutation.isPending} size="lg" className="w-full sm:w-auto">Asignar Membresía</Button>
      </form>

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
                <Button onClick={() => setConfirmOpen('renovar')} size="sm">Renovar</Button>
                <Button onClick={() => setConfirmOpen('cancelar')} variant="outline" size="sm" className="text-destructive! border-destructive/30! hover:bg-destructive/10!">Cancelar</Button>
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

      {showHistorial && (
        <>
          <div className="fixed inset-0 bg-black/60 pointer-events-none z-40" />
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

      <ConfirmModal
        open={confirmOpen === 'renovar'}
        title="Renovar membresía"
        message="Se creará una nueva membresía a partir de la fecha de vencimiento actual. ¿Desea continuar?"
        confirmText="Renovar"
        variant="primary"
        onConfirm={() => estado?.membresiaActiva && renovarMutation.mutate(estado.membresiaActiva.id)}
        onCancel={() => setConfirmOpen(null)}
        loading={renovarMutation.isPending}
      />
      <ConfirmModal
        open={confirmOpen === 'cancelar'}
        title="Cancelar membresía"
        message="Esta acción conservará el historial. ¿Está seguro?"
        confirmText="Cancelar membresía"
        variant="danger"
        onConfirm={() => estado?.membresiaActiva && cancelarMutation.mutate(estado.membresiaActiva.id)}
        onCancel={() => setConfirmOpen(null)}
        loading={cancelarMutation.isPending}
      />
    </div>
  )
}
