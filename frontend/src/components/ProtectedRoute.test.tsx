import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuthStore } from '@/store/auth.store'

function renderRoute() {
  return render(<MemoryRouter initialEntries={['/privado']}><Routes>
    <Route path="/login" element={<div>LOGIN</div>} />
    <Route path="/privado" element={<ProtectedRoute><div>PRIVADO</div></ProtectedRoute>} />
  </Routes></MemoryRouter>)
}

beforeEach(() => useAuthStore.setState({ token: null, refreshToken: null, usuario: null, cliente: null, inicializado: true }))

describe('ProtectedRoute', () => {
  it('redirige a login sin sesión', () => {
    renderRoute()
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
  })

  it('renderiza el contenido con token', () => {
    useAuthStore.setState({ token: 'access-token' })
    renderRoute()
    expect(screen.getByText('PRIVADO')).toBeInTheDocument()
  })

  it('no decide mientras la sesión se inicializa', () => {
    useAuthStore.setState({ inicializado: false })
    renderRoute()
    expect(screen.getByText(/Verificando sesi/)).toBeInTheDocument()
  })
})
