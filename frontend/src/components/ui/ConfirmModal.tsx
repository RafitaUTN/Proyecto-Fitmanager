import { Button } from './Button'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmModal({ open, title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', variant = 'danger', onConfirm, onCancel, loading }: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={onCancel}>
      <div className="fixed inset-0 bg-black/60 pointer-events-none" />
      <div
        className="relative bg-surface border border-border rounded-card p-6 w-full max-w-md shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading text-2xl text-foreground tracking-wider">{title}</h3>
        <p className="text-sm text-muted">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>{cancelText}</Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={loading}
            className={variant === 'danger' ? 'bg-destructive hover:brightness-110!' : ''}
          >
            {loading ? 'Procesando...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
