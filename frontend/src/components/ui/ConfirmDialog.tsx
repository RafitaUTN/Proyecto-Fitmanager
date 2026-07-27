import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
  icon?: React.ReactNode
}

export function ConfirmDialog({ open, onConfirm, onCancel, title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'danger', loading, icon }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative bg-surface border border-border rounded-card p-6 w-full max-w-sm shadow-xl cursor-default"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="text-center">
              {icon && <div className="mb-3 flex justify-center">{icon}</div>}
              <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted mb-6">{description}</p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
              <Button
                variant="primary"
                onClick={onConfirm}
                disabled={loading}
                className={variant === 'danger' ? 'bg-destructive hover:brightness-110!' : ''}
              >
                {loading ? 'Procesando...' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
