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

  useEffect(() => { cargar() }, [])

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
        <h2 className="text-xl font-bold">Alertas de Membresía</h2>
        <Button onClick={generarAlertas} disabled={generando}>
          {generando ? 'Generando...' : `Generar Alertas ${noLeidas > 0 ? `(${noLeidas} sin leer)` : ''}`}
        </Button>
      </div>

      <div className="space-y-3">
        {notificaciones.map((n) => (
          <div
            key={n.id_notificacion}
            className={`rounded-lg shadow p-4 border-l-4 ${n.leida ? 'bg-white border-l-gray-300' : 'bg-blue-50 border-l-blue-500'}`}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm">{n.titulo}</h3>
                <p className="text-sm text-gray-700">{n.mensaje}</p>
                <p className="text-xs text-gray-500">
                  {n.cliente.nombre} {n.cliente.apellido} &middot; {new Date(n.fecha_envio).toLocaleString()}
                </p>
              </div>
              {!n.leida && (
                <button
                  onClick={() => marcarLeida(n.id_notificacion)}
                  className="text-xs text-blue-600 hover:underline shrink-0"
                >
                  Marcar leída
                </button>
              )}
            </div>
          </div>
        ))}
        {notificaciones.length === 0 && (
          <p className="text-gray-500 text-center py-8">No hay alertas. Presiona "Generar Alertas" para revisar membresías próximas a vencer.</p>
        )}
      </div>
    </div>
  )
}
