/**
 * Componente de interfaz reutilizable ConfirmModal.
 *
 * @remarks Unifica estilos y comportamiento visual para mantener consistencia en las pantallas de FitManager.
 */
import { ConfirmDialog } from './ConfirmDialog'

interface OldConfirmModalProps {
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

export function ConfirmModal({ message, confirmText, cancelText, ...props }: OldConfirmModalProps) {
  return <ConfirmDialog {...props} description={message} confirmLabel={confirmText} cancelLabel={cancelText} />
}
