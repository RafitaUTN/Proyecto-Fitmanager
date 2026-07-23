import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth.store'
import { ConfirmModal } from './ConfirmModal'
import { Button } from '@/components/ui/Button'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface SolicitudData {
  id: number
  estado: string
  fecha_solicitud: string
  fecha_respuesta: string | null
  motivo: string | null
  observaciones: string | null
  cliente: { id_cliente: number; nombre: string; apellido: string; cedula: string }
  gym_origen: { id_gimnasio: number; nombre: string }
  gym_destino: { id_gimnasio: number; nombre: string }
  usuario_solicita: { id_usuario: number; nombre: string; apellido: string }
  usuario_respuesta: { id_usuario: number; nombre: string; apellido: string } | null
  auditorias: {
    id: number
    accion: string
    id_usuario: number | null
    fecha: string
    ip: string | null
    estado_anterior: string | null
    estado_nuevo: string
    observaciones: string | null
  }[]
  notificaciones: { id_notificacion: number; leida: boolean }[]
}

interface Props {
  solicitudId: number | null
  onClose: () => void
  onActualizar: () => void
}

const badges: Record<string, string> = {
  PENDIENTE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  APROBADA: 'bg-green-500/10 text-green-400 border-green-500/20',
  RECHAZADA: 'bg-red-500/10 text-red-400 border-red-500/20',
  CANCELADA: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const timelineIcons: Record<string, string> = {
  CREADA: '●',
  EXPIRADA: '●',
  APROBADA: '●',
  RECHAZADA: '●',
  CANCELADA: '●',
}

export function TransferenciaDrawer({ solicitudId, onClose, onActualizar }: Props) {
  const { token, usuario } = useAuthStore()
  const [data, setData] = useState<SolicitudData | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'aprobar' | 'rechazar' | 'cancelar' | null>(null)
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!solicitudId || !token) return
    setLoading(true)
    fetch(`${API_URL}/transferencias/${solicitudId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [solicitudId, token])

  useEffect(() => {
    if (!solicitudId) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [solicitudId, onClose])

  async function ejecutarAccion() {
    if (!data || !confirmAction || !token) return
    setSubmitting(true)
    const url = `${API_URL}/transferencias/${data.id}/${confirmAction === 'cancelar' ? 'cancelar' : confirmAction === 'aprobar' ? 'aprobar' : 'rechazar'}`
    const body = confirmAction === 'cancelar' ? {} : { observaciones: observaciones || 'Sin observaciones' }
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    setSubmitting(false)
    setConfirmAction(null)
    setObservaciones('')
    if (res.ok) {
      onActualizar()
      const updated = await fetch(`${API_URL}/transferencias/${data.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (updated.ok) setData(await updated.json())
    }
  }

  const isAdmin = usuario?.rol === 'Administrador'
  const esOrigen = data && usuario && Number(data.gym_origen.id_gimnasio) === Number(usuario.id_gimnasio)
  const esDestino = data && usuario && Number(data.gym_destino.id_gimnasio) === Number(usuario.id_gimnasio)
  const esPendiente = data?.estado === 'PENDIENTE'

  const puedeAprobarRechazar = isAdmin && esOrigen && esPendiente
  const puedeCancelar = esDestino && esPendiente

  return (
    <AnimatePresence>
      {solicitudId && (
          <motion.div
            key="drawer"
            className="fixed inset-0 z-50 flex justify-end cursor-pointer"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative w-full max-w-[480px] bg-surface border-l border-border h-dvh overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-2xl text-foreground tracking-wider">TRANSFERENCIA</h2>
                <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer bg-transparent border-none text-lg">✕</button>
              </div>

              {loading && (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-6 bg-surface-light rounded animate-pulse" />)}
                </div>
              )}

              {data && !loading && (
                <>
                  <section>
                    <h3 className="text-xs font-semibold tracking-wider text-muted-dark uppercase mb-3">INFORMACIÓN DEL CLIENTE</h3>
                    <div className="bg-background rounded-card border border-border p-4 space-y-1">
                      <p className="text-foreground font-medium">{data.cliente.nombre} {data.cliente.apellido}</p>
                      <p className="text-sm text-muted">Cédula: {data.cliente.cedula}</p>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold tracking-wider text-muted-dark uppercase mb-3">GIMNASIOS</h3>
                    <div className="flex items-center gap-3 bg-background rounded-card border border-border p-4">
                      <div className="flex-1 text-center">
                        <p className="text-sm font-medium text-foreground">{data.gym_origen.nombre}</p>
                        <p className="text-xs text-muted-dark">Origen</p>
                      </div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary shrink-0"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      <div className="flex-1 text-center">
                        <p className="text-sm font-medium text-foreground">{data.gym_destino.nombre}</p>
                        <p className="text-xs text-muted-dark">Destino</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold tracking-wider text-muted-dark uppercase mb-3">ESTADO</h3>
                    <span className={`inline-block text-xs px-3 py-1.5 rounded-badge font-medium border ${badges[data.estado] || 'bg-gray-500/10 text-gray-400'}`}>
                      {data.estado}
                    </span>
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold tracking-wider text-muted-dark uppercase mb-3">FECHAS</h3>
                    <div className="bg-background rounded-card border border-border p-4 space-y-1 text-sm">
                      <p className="text-muted">Solicitud: <span className="text-foreground">{new Date(data.fecha_solicitud).toLocaleString()}</span></p>
                      {data.fecha_respuesta && <p className="text-muted">Respuesta: <span className="text-foreground">{new Date(data.fecha_respuesta).toLocaleString()}</span></p>}
                    </div>
                  </section>

                  {data.motivo && (
                    <section>
                      <h3 className="text-xs font-semibold tracking-wider text-muted-dark uppercase mb-3">MOTIVO</h3>
                      <div className="bg-background rounded-card border border-border p-4">
                        <p className="text-sm text-foreground">{data.motivo}</p>
                      </div>
                    </section>
                  )}

                  {data.observaciones && (
                    <section>
                      <h3 className="text-xs font-semibold tracking-wider text-muted-dark uppercase mb-3">OBSERVACIONES</h3>
                      <div className="bg-background rounded-card border border-border p-4">
                        <p className="text-sm text-foreground">{data.observaciones}</p>
                      </div>
                    </section>
                  )}

                  {data.usuario_solicita && (
                    <section>
                      <h3 className="text-xs font-semibold tracking-wider text-muted-dark uppercase mb-3">SOLICITADO POR</h3>
                      <p className="text-sm text-foreground bg-background rounded-card border border-border p-4">
                        {data.usuario_solicita.nombre} {data.usuario_solicita.apellido}
                      </p>
                    </section>
                  )}

                  {data.usuario_respuesta && (
                    <section>
                      <h3 className="text-xs font-semibold tracking-wider text-muted-dark uppercase mb-3">RESPONDIDO POR</h3>
                      <p className="text-sm text-foreground bg-background rounded-card border border-border p-4">
                        {data.usuario_respuesta.nombre} {data.usuario_respuesta.apellido}
                      </p>
                    </section>
                  )}

                  {data.auditorias.length > 0 && (
                    <section>
                      <h3 className="text-xs font-semibold tracking-wider text-muted-dark uppercase mb-3">TIMELINE</h3>
                      <div className="space-y-0">
                        {data.auditorias.map((a, i) => (
                          <motion.div
                            key={a.id}
                            className="flex gap-3"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-primary text-sm">{timelineIcons[a.accion] || '●'}</span>
                              {i < data.auditorias.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                            </div>
                            <div className="pb-4 flex-1">
                              <p className="text-sm font-medium text-foreground capitalize">{a.accion.toLowerCase()}</p>
                              <p className="text-xs text-muted-dark">{new Date(a.fecha).toLocaleString()}</p>
                              {a.observaciones && <p className="text-xs text-muted mt-0.5">{a.observaciones}</p>}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {puedeAprobarRechazar && (
                    <section className="space-y-3 border-t border-border pt-4">
                      <h3 className="text-xs font-semibold tracking-wider text-muted-dark uppercase">ACCIONES</h3>
                      <textarea
                        placeholder="Observaciones (obligatorio para rechazar)"
                        className="w-full rounded-input border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-dark focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                        rows={3}
                        value={observaciones}
                        onChange={e => setObservaciones(e.target.value)}
                      />
                      <div className="flex gap-3">
                        <Button variant="primary" onClick={() => setConfirmAction('aprobar')}>Aprobar</Button>
                        <Button variant="outline" onClick={() => setConfirmAction('rechazar')} className="bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20">Rechazar</Button>
                      </div>
                    </section>
                  )}

                  {puedeCancelar && (
                    <section className="space-y-3 border-t border-border pt-4">
                      <h3 className="text-xs font-semibold tracking-wider text-muted-dark uppercase">ACCIONES</h3>
                      <Button variant="outline" onClick={() => setConfirmAction('cancelar')} className="bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20">Cancelar solicitud</Button>
                    </section>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      <ConfirmModal
        key="aprobar"
        open={confirmAction === 'aprobar'}
        onConfirm={ejecutarAccion}
        onCancel={() => setConfirmAction(null)}
        title="Aprobar transferencia"
        description="¿Estás seguro de aprobar esta transferencia? El cliente será movido al gimnasio destino y su membresía actual será cancelada."
        confirmLabel="Aprobar"
        loading={submitting}
      />
      <ConfirmModal
        key="rechazar"
        open={confirmAction === 'rechazar'}
        onConfirm={ejecutarAccion}
        onCancel={() => setConfirmAction(null)}
        title="Rechazar transferencia"
        description={`¿Estás seguro de rechazar esta transferencia?${!observaciones ? ' Debes agregar un motivo.' : ''}`}
        confirmLabel="Rechazar"
        variant="danger"
        loading={submitting}
      />
      <ConfirmModal
        key="cancelar"
        open={confirmAction === 'cancelar'}
        onConfirm={ejecutarAccion}
        onCancel={() => setConfirmAction(null)}
        title="Cancelar solicitud"
        description="¿Estás seguro de cancelar esta solicitud de transferencia?"
        confirmLabel="Cancelar solicitud"
        variant="danger"
        loading={submitting}
      />
    </AnimatePresence>
  )
}
