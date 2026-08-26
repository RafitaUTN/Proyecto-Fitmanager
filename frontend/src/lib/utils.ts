/**
 * Utilidad frontend utils.
 *
 * @remarks Centraliza lógica compartida por páginas, hooks o componentes del cliente web.
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
