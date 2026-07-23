import { Routes, Route } from 'react-router-dom'
import { Landing } from '@/pages/Landing'
import { RegistroGimnasio } from '@/pages/RegistroGimnasio'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { ProtectedRoute } from '@/components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/registro" element={<RegistroGimnasio />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    </Routes>
  )
}

export default App
