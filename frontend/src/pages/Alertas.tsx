import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface Notificacion {
  id_notificacion: number
  titulo: string
  mensaje: string
  fecha_envio: string
  leida: boolean
  cliente: { nombre: string; apellido: string }
}

export function Alertas() {
  const token = useAuthStore((s) => s.token)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [generando, setGenerando] = useState(false)

  async function cargar() {
    const res = await fetch(`${API_URL}/notificaciones`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setNotificaciones(await res.json())
  }

  useEffect(() => {
    fetch(`${API_URL}/notificaciones/generar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(() => cargar())
  }, [])

  async function generarAlertas() {
    setGenerando(true)
    await fetch(`${API_URL}/notificaciones/generar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    setGenerando(false)
    cargar()
  }

  async function marcarLeida(id: number) {
    await fetch(`${API_URL}/notificaciones/${id}/leer`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    })
    cargar()
  }

  const noLeidas = notificaciones.filter(n => !n.leida).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-3xl text-foreground tracking-wider">ALERTAS</h2>
        <Button onClick={generarAlertas} disabled={generando} variant="outline">
          {generando ? 'Generando...' : `Actualizar Alertas${noLeidas > 0 ? ` (${noLeidas} sin leer)` : ''}`}
        </Button>
      </div>

      <div className="space-y-3">
        {notificaciones.map((n) => (
          <div
            key={n.id_notificacion}
            className={`rounded-card border p-4 transition-all duration-200 ${n.leida ? 'bg-surface border-border' : 'bg-surface border-l-2 border-l-primary border-border'}`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1.5 flex-1">
                <h3 className="font-semibold text-sm text-foreground">{n.titulo}</h3>
                <p className="text-sm text-muted">{n.mensaje}</p>
                <p className="text-xs text-muted-dark">
                  {n.cliente.nombre} {n.cliente.apellido} &middot; {new Date(n.fecha_envio).toLocaleString()}
                </p>
              </div>
              {!n.leida && (
                <button
                  onClick={() => marcarLeida(n.id_notificacion)}
                  className="text-xs text-primary hover:underline shrink-0 font-medium"
                >
                  Marcar leída
                </button>
              )}
            </div>
          </div>
        ))}
        {notificaciones.length === 0 && (
          <p className="text-muted text-center py-12">No hay alertas. Las membresías activas están al día.</p>
        )}
      </div>
    </div>
  )
}
