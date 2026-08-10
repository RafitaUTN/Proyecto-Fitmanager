import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useBuscarClienteTransferencia, type ClienteTransferible } from '@/hooks/use-transferencias'

interface Props {
  open: boolean
  onClose: () => void
  onEncontrado: (data: ClienteTransferible) => void
}

export function BuscarClienteTransferenciaModal({ open, onClose, onEncontrado }: Props) {
  const [cedula, setCedula] = useState('')
  const [error, setError] = useState('')
  const busqueda = useBuscarClienteTransferencia()

  function buscar() {
    setError('')
    if (!cedula.trim()) {
      setError('Ingresa la cédula del cliente')
      return
    }
    busqueda.mutate(cedula.trim(), {
      onSuccess: (data) => { onEncontrado(data) },
      onError: (err: Error) => { setError(err.message) },
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div
        className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-2xl cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold tracking-[2px] text-muted-dark uppercase mb-2">Transferencia de cliente</p>
        <h3 className="text-2xl font-heading tracking-wider text-foreground leading-tight">Solicitar transferencia</h3>
        <p className="text-sm text-muted mt-2">
          Busca un cliente registrado en otro gimnasio por su cédula para solicitar su transferencia a este gimnasio.
        </p>

        <div className="mt-5 space-y-2">
          <label className="block text-sm font-medium text-muted mb-1.5">Cédula</label>
          <Input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') buscar() }}
            placeholder="Ingresa la cédula"
            maxLength={20}
            autoFocus
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-button">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={busqueda.isPending}>
            Cancelar
          </Button>
          <Button onClick={buscar} disabled={busqueda.isPending}>
            {busqueda.isPending ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
