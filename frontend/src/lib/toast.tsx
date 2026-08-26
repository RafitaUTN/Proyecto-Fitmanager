/**
 * Utilidad frontend toast.
 *
 * @remarks Centraliza lógica compartida por páginas, hooks o componentes del cliente web.
 */
import { useState, useCallback, useRef, type ReactNode } from 'react'
import { ToastContext, type Toast, type ToastType } from './toast-context'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++counterRef.current
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => removeToast(id), 4000)
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed left-3 right-3 top-3 z-[100] flex flex-col gap-2 sm:left-auto sm:right-4 sm:top-auto sm:bottom-4 sm:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-full px-4 py-3 rounded-button shadow-2xl text-sm font-medium cursor-pointer animate-slide-up border transition-all sm:w-auto ${
              t.type === 'success'
                ? 'bg-secondary/10 text-green-400 border-green-500/20'
                : t.type === 'error'
                  ? 'bg-destructive/10 text-red-400 border-red-500/20'
                  : 'bg-surface text-foreground border-border'
            }`}
            onClick={() => removeToast(t.id)}
            role="alert"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
