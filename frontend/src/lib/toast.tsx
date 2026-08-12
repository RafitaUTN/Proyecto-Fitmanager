import { useState, useCallback, useRef, type ReactNode } from 'react'
import { ToastContext, type Toast, type ToastType } from './toast-context'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counterRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 4000)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-button shadow-2xl text-sm font-medium cursor-pointer animate-slide-up border transition-all ${
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
