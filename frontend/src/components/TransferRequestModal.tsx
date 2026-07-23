import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export interface TransferRequestData {
  cliente: {
    id_cliente: number
    nombre: string
    apellido: string
    cedula: string
  }
  gimnasio: {
    nombre: string
  }
  estado: string
}

interface Props {
  open: boolean
  data: TransferRequestData | null
  onCancel: () => void
  onSuccess: () => void
}

export function TransferRequestModal({ open, data, onCancel, onSuccess }: Props) {
  const token = useAuthStore((s) => s.token)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  useEffect(() => {
    if (open) { setMotivo(''); setError('') }
  }, [open, data])

  async function solicitar() {
    if (!data || !token) return
    setLoading(true)
    const res = await fetch(`${API_URL}/transferencias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id_cliente: data.cliente.id_cliente, motivo: motivo.trim() || undefined }),
    })
    setLoading(false)

    if (res.ok) {
      onSuccess()
      return
    }
    const err = await res.json().catch(() => ({ error: 'Error al procesar la solicitud' }))
    setError(err.error || 'Error desconocido')
  }

  return (
    <AnimatePresence>
      {open && data && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={onCancel}
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
            className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <p className="text-xs font-semibold tracking-[2px] text-muted-dark uppercase mb-2">Cliente encontrado</p>
            <h3 className="text-2xl font-heading tracking-wider text-foreground leading-tight">
              {data.cliente.nombre} {data.cliente.apellido}
            </h3>
            <p className="text-sm text-muted mt-2">Cédula: {data.cliente.cedula}</p>

            <div className="mt-5 rounded-card border border-border bg-background p-4 space-y-1">
              <p className="text-sm text-muted">Actualmente pertenece a:</p>
              <p className="text-foreground font-medium">{data.gimnasio.nombre}</p>
              <p className="text-xs text-secondary">Estado: {data.estado}</p>
            </div>

            <p className="mt-5 text-sm text-muted">
              Este cliente ya posee una cuenta activa en otro gimnasio. Puede solicitar una transferencia.
            </p>

            <div className="mt-5 space-y-2">
              <label className="block text-sm font-medium text-muted mb-1.5">Motivo opcional</label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explica brevemente la solicitud"
                maxLength={300}
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-button">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={solicitar} disabled={loading}>
                {loading ? 'Solicitando...' : 'Solicitar'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}