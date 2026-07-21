import { useEffect, useState } from 'react'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Usuarios } from './Usuarios'
import { Clientes } from './Clientes'
import { Membresias } from './Membresias'
import { AsignarMembresia } from './AsignarMembresia'
import { EstadoMembresia } from './EstadoMembresia'
import { Alertas } from './Alertas'
import { Pagos } from './Pagos'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function Sidebar() {
  const { usuario, token } = useAuthStore()
  const [noLeidas, setNoLeidas] = useState(0)

  useEffect(() => {
    fetch(`${API_URL}/notificaciones/contar`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok && r.json()).then(d => d && setNoLeidas(d.total))
  }, [])

  return (
    <aside className="w-64 bg-white shadow-md p-6 space-y-6">
      <h2 className="text-lg font-bold">FitManager</h2>
      <p className="text-sm text-gray-600">{usuario?.nombre} ({usuario?.rol})</p>
      <nav className="space-y-2">
        <Link to="/dashboard" className="block text-sm text-gray-700 hover:text-blue-600">Dashboard</Link>
        <Link to="/dashboard/usuarios" className="block text-sm text-gray-700 hover:text-blue-600">Usuarios</Link>
        <Link to="/dashboard/clientes" className="block text-sm text-gray-700 hover:text-blue-600">Clientes</Link>
        <Link to="/dashboard/membresias" className="block text-sm text-gray-700 hover:text-blue-600">Membresías</Link>
        <Link to="/dashboard/asignar-membresia" className="block text-sm text-gray-700 hover:text-blue-600">Asignar Membresía</Link>
        <Link to="/dashboard/estado-membresia" className="block text-sm text-gray-700 hover:text-blue-600">Estado Membresía</Link>
        <Link to="/dashboard/alertas" className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600">
          Alertas
          {noLeidas > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{noLeidas}</span>
          )}
        </Link>
        <Link to="/dashboard/pagos" className="block text-sm text-gray-700 hover:text-blue-600">Pagos</Link>
      </nav>
    </aside>
  )
}

function DashboardHome() {
  const navigate = useNavigate()
  const { logout: clearAuth, token } = useAuthStore()

  async function cerrarSesion() {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    clearAuth()
    navigate('/')
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold">Panel Principal</h1>
      <Button onClick={cerrarSesion}>Cerrar Sesión</Button>
    </div>
  )
}

export function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="membresias" element={<Membresias />} />
          <Route path="asignar-membresia" element={<AsignarMembresia />} />
          <Route path="estado-membresia" element={<EstadoMembresia />} />
          <Route path="alertas" element={<Alertas />} />
          <Route path="pagos" element={<Pagos />} />
        </Routes>
      </main>
    </div>
  )
}
