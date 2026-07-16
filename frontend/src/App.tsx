import { Routes, Route, Link } from 'react-router-dom'
import { RegistroGimnasio } from '@/pages/RegistroGimnasio'

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
      <h1 className="text-3xl font-bold">FitManager</h1>
      <p className="text-gray-600">Sistema de administración de gimnasios</p>
      <Link to="/registro" className="text-blue-600 underline">Registrar gimnasio</Link>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/registro" element={<RegistroGimnasio />} />
    </Routes>
  )
}

export default App
