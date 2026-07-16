import { Routes, Route, Link } from 'react-router-dom'
import { RegistroGimnasio } from '@/pages/RegistroGimnasio'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { ProtectedRoute } from '@/components/ProtectedRoute'

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
      <h1 className="text-3xl font-bold">FitManager</h1>
      <p className="text-gray-600">Sistema de administración de gimnasios</p>
      <div className="flex gap-4">
        <Link to="/registro" className="text-blue-600 underline">Registrar gimnasio</Link>
        <Link to="/login" className="text-blue-600 underline">Iniciar sesión</Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/registro" element={<RegistroGimnasio />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    </Routes>
  )
}

export default App
