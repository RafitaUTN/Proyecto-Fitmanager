import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface Cliente { id_cliente: number; nombre: string; apellido: string; cedula: string }

interface EstadoData {
  cliente: Cliente
  membresiaActiva: { id: number; plan: string; inicio: string; fin: string; diasRestantes: number } | null
  membresiaVencida: { id: number; plan: string; fin: string } | null
}

export function EstadoMembresia() {
  const token = useAuthStore((s) => s.token)
  const [cedula, setCedula] = useState('')
  const [estado, setEstado] = useState<EstadoData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function buscar() {
    if (!cedula.trim()) return
    setLoading(true)
    setError('')
    setEstado(null)

    const cRes = await fetch(`${API_URL}/clientes?cedula=${encodeURIComponent(cedula)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!cRes.ok) { setLoading(false); setError('Cliente no encontrado'); return }
    const clientes: Cliente[] = await cRes.json()
    if (clientes.length === 0) { setLoading(false); setError('Cliente no encontrado'); return }

    const cliente = clientes[0]
    const eRes = await fetch(`${API_URL}/clientes-membresias/${cliente.id_cliente}/estado`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (eRes.ok) setEstado(await eRes.json())
    else setError('Error al consultar estado')
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl text-foreground tracking-wider">ESTADO MEMBRESÍA</h2>

      <div className="flex gap-3">
        <input
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          placeholder="Buscar por cédula..."
          className="rounded-input border border-border bg-surface text-foreground placeholder:text-muted-dark px-4 py-2.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => e.key === 'Enter' && buscar()}
        />
        <Button onClick={buscar} disabled={loading}>Consultar</Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {estado && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-card p-5 space-y-2">
            <h3 className="font-heading text-lg text-foreground tracking-wider">CLIENTE</h3>
            <p className="text-lg text-foreground font-medium">{estado.cliente.nombre} {estado.cliente.apellido}</p>
            <p className="text-sm text-muted">Cédula: {estado.cliente.cedula}</p>
          </div>

          {estado.membresiaActiva ? (
            <div className="bg-surface border border-secondary/30 rounded-card p-5 space-y-2">
              <h3 className="font-heading text-lg text-secondary tracking-wider">MEMBRESÍA ACTIVA</h3>
              <p className="text-lg font-bold text-foreground">{estado.membresiaActiva.plan}</p>
              <p className="text-sm text-muted">
                Inicio: {new Date(estado.membresiaActiva.inicio).toLocaleDateString()}
              </p>
              <p className="text-sm text-muted">
                Vence: {new Date(estado.membresiaActiva.fin).toLocaleDateString()}
              </p>
              <p className="text-xl font-bold text-secondary">
                {estado.membresiaActiva.diasRestantes} días restantes
              </p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-card p-5 space-y-2">
              <h3 className="font-heading text-lg text-foreground tracking-wider">MEMBRESÍA ACTIVA</h3>
              <p className="text-muted">Sin membresía activa</p>
              {estado.membresiaVencida && (
                <p className="text-sm text-destructive">
                  Última membresía vencida: {estado.membresiaVencida.plan}
                  (venció el {new Date(estado.membresiaVencida.fin).toLocaleDateString()})
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
