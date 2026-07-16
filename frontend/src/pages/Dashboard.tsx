import { Link, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Usuarios } from './Usuarios'
import { Clientes } from './Clientes'
import { Membresias } from './Membresias'
import { AsignarMembresia } from './AsignarMembresia'

function Sidebar() {
  const { usuario } = useAuthStore()
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
      </nav>
    </aside>
  )
}

function DashboardHome() {
  const { logout } = useAuthStore()
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold">Panel Principal</h1>
      <Button onClick={logout}>Cerrar Sesión</Button>
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
        </Routes>
      </main>
    </div>
  )
}
