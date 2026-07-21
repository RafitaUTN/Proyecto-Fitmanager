import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-input border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-dark focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200',
        className
      )}
      {...props}
    />
  )
}
