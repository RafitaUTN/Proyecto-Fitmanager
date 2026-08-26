/**
 * Hook de utilidad para diferir búsquedas y filtros escritos por el usuario.
 *
 * @remarks Reduce peticiones por pulsación sin cambiar el valor visible del input.
 */
import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debouncedValue
}
