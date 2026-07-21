import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

const variants = {
  primary: 'bg-primary text-white hover:brightness-110',
  outline: 'bg-transparent border border-white/20 text-white hover:bg-white/10',
  ghost: 'bg-transparent text-muted hover:text-foreground hover:bg-white/5',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3 text-base',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export function Button({ className, variant = 'primary', size = 'md', children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-button font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
