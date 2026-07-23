import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'

interface ConfirmModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description: string
  confirmLabel?: string
  variant?: 'primary' | 'danger'
  loading?: boolean
}

export function ConfirmModal({ open, onConfirm, onCancel, title, description, confirmLabel = 'Confirmar', variant = 'primary', loading }: ConfirmModalProps) {
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
            className="relative bg-surface border border-border rounded-card p-6 w-full max-w-md shadow-xl cursor-default"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted mb-6">{description}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
              <Button
                variant={variant === 'danger' ? 'outline' : 'primary'}
                onClick={onConfirm}
                disabled={loading}
                className={variant === 'danger' ? 'bg-destructive text-white hover:brightness-110 border-0' : ''}
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
