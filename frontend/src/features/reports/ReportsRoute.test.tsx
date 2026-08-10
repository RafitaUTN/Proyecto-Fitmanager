import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { ReportsRoute } from './ReportsRoute'

vi.mock('@/pages/Reportes', () => ({ Reportes: () => <h1>REPORTES ADMIN</h1> }))

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/reportes']}>
      <Routes>
        <Route path="/dashboard" element={<p>DASHBOARD</p>} />
        <Route path="/dashboard/reportes" element={<ReportsRoute />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useAuthStore.setState({ token: 'access', usuario: null, cliente: null, actorType: 'STAFF', inicializado: true })
})

describe('ruta administrativa de reportes', () => {
  it('renderiza el módulo para Administrador', async () => {
    useAuthStore.setState({
      usuario: {
        id_usuario: 1,
        id_gimnasio: 1,
        nombre: 'Admin',
        apellido: 'QA',
        correo: 'admin@test.invalid',
        rol: 'Administrador',
      },
    })
    renderRoute()
    expect(await screen.findByText('REPORTES ADMIN')).toBeInTheDocument()
  })

  it.each(['Recepcionista', 'Entrenador'])('redirige a %s fuera de la ruta', async (rol) => {
    useAuthStore.setState({
      usuario: {
        id_usuario: 2,
        id_gimnasio: 1,
        nombre: 'Staff',
        apellido: 'QA',
        correo: 'staff@test.invalid',
        rol,
      },
    })
    renderRoute()
    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument()
    expect(screen.queryByText('REPORTES ADMIN')).not.toBeInTheDocument()
  })
})
