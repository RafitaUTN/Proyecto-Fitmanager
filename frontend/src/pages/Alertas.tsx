import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { TransferenciaDrawer } from '@/components/TransferenciaDrawer'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const ALL_TABS = [
  { key: '', label: 'Todas' },
  { key: 'MEMBRESIA', label: 'Membresías' },
  { key: 'TRANSFERENCIA', label: 'Transferencias' },
  { key: 'SISTEMA', label: 'Sistema' },
] as const

const TRAINER_TABS = [
  { key: '', label: 'Todas' },
  { key: 'MEMBRESIA', label: 'Membresías' },
  { key: 'SISTEMA', label: 'Sistema' },
] as const

const badges: Record<string, string> = {
  PENDIENTE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  APROBADA: 'bg-green-500/10 text-green-400 border-green-500/20',
  RECHAZADA: 'bg-red-500/10 text-red-400 border-red-500/20',
  CANCELADA: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

function tiempoRelativo(fecha: string) {
  const diff = Date.now() - new Date(fecha).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const dias = Math.floor(hrs / 24)
  if (dias < 7) return `Hace ${dias}d`
  const semanas = Math.floor(dias / 7)
  return `Hace ${semanas} sem`
}

interface Notificacion {
  id_notificacion: number
  titulo: string
  mensaje: string
  fecha_envio: string
  leida: boolean
  tipo: 'MEMBRESIA' | 'TRANSFERENCIA' | 'SISTEMA'
  cliente: { nombre: string; apellido: string } | null
  solicitud: { id: number; estado: string } | null
}

export function Alertas() {
  const { token, usuario } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabActivo = searchParams.get('tipo') || ''
  const [selectedSolicitud, setSelectedSolicitud] = useState<number | null>(null)
  const tabs = usuario?.rol === 'Entrenador' ? TRAINER_TABS : ALL_TABS

  const { data: notificaciones, isLoading } = useQuery({
    queryKey: ['notificaciones', tabActivo],
    queryFn: async () => {
      const params = tabActivo ? `?tipo=${tabActivo}` : ''
      const res = await fetch(`${API_URL}/notificaciones${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Error al cargar notificaciones')
      return res.json() as Promise<Notificacion[]>
    },
    enabled: !!token,
  })

  const marcarMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${API_URL}/notificaciones/${id}/leer`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificaciones'] }),
  })

  const generarMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${API_URL}/notificaciones/generar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificaciones'] }),
  })

  function setTab(key: string) {
    if (key) setSearchParams({ tipo: key })
    else setSearchParams({})
  }

  const noLeidas = notificaciones?.filter(n => !n.leida).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">NOTIFICACIONES</h2>
        <Button onClick={() => generarMutation.mutate()} disabled={generarMutation.isPending} variant="outline" size="sm">
          {generarMutation.isPending ? 'Generando...' : `Actualizar${noLeidas > 0 ? ` (${noLeidas} sin leer)` : ''}`}
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-badge transition-all cursor-pointer border ${
              tabActivo === t.key
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-muted border-border hover:text-foreground hover:bg-surface-light'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface border border-border rounded-card p-4 animate-pulse">
                <div className="h-4 bg-surface-light rounded w-1/3 mb-2" />
                <div className="h-3 bg-surface-light rounded w-2/3 mb-2" />
                <div className="h-3 bg-surface-light rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {notificaciones?.map((n) => (
          <div
            key={n.id_notificacion}
            className={`rounded-card border p-4 transition-all duration-200 ${
              n.leida ? 'bg-surface border-border' : 'bg-surface border-l-2 border-l-primary border-border'
            }`}
          >
            {n.tipo === 'TRANSFERENCIA' ? (
              <div className="flex items-start gap-3">
                <span className="text-primary shrink-0 mt-0.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Solicitud de transferencia</p>
                  <p className="text-sm text-muted truncate">{n.mensaje}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted-dark">{tiempoRelativo(n.fecha_envio)}</span>
                    {n.solicitud && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-badge font-medium border ${badges[n.solicitud.estado] || 'bg-gray-500/10 text-gray-400'}`}>
                        {n.solicitud.estado}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {n.solicitud && (
                      <button
                        onClick={() => setSelectedSolicitud(n.solicitud!.id)}
                        className="text-xs text-primary hover:underline font-medium cursor-pointer bg-transparent border-none"
                      >
                        Ver solicitud
                      </button>
                    )}
                    {!n.leida && (
                      <button
                        onClick={() => marcarMutation.mutate(n.id_notificacion)}
                        className="text-xs text-muted-dark hover:text-foreground font-medium cursor-pointer bg-transparent border-none"
                      >
                        Marcar leída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className={`shrink-0 mt-0.5 ${n.tipo === 'SISTEMA' ? 'text-muted-dark' : 'text-muted'}`}>
                  {n.tipo === 'SISTEMA' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{n.titulo}</h3>
                  <p className="text-sm text-muted">{n.mensaje}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted-dark">{tiempoRelativo(n.fecha_envio)}</span>
                    {n.cliente && (
                      <span className="text-xs text-muted-dark">{n.cliente.nombre} {n.cliente.apellido}</span>
                    )}
                  </div>
                  {!n.leida && (
                    <button
                      onClick={() => marcarMutation.mutate(n.id_notificacion)}
                      className="text-xs text-primary hover:underline font-medium mt-1.5 cursor-pointer bg-transparent border-none"
                    >
                      Marcar leída
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {notificaciones?.length === 0 && !isLoading && (
          <p className="text-muted text-center py-12">No hay notificaciones.</p>
        )}
      </div>

      {selectedSolicitud !== null && (
        <TransferenciaDrawer
          solicitudId={selectedSolicitud}
          onClose={() => setSelectedSolicitud(null)}
          onActualizar={() => queryClient.invalidateQueries({ queryKey: ['notificaciones'] })}
        />
      )}
    </div>
  )
}
