import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

export function Button({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
