import { Routes, Route } from 'react-router-dom'
import { Landing } from '@/pages/Landing'
import { RegistroGimnasio } from '@/pages/RegistroGimnasio'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary name="App">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/registro" element={<RegistroGimnasio />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
