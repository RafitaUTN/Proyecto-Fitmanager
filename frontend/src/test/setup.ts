/**
 * Configuración de pruebas frontend setup.
 *
 * @remarks Prepara el entorno de Vitest y Testing Library para pruebas de componentes.
 */
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})
