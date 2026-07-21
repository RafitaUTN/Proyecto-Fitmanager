import { Routes, Route, Link } from 'react-router-dom'
import { RegistroGimnasio } from '@/pages/RegistroGimnasio'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { ProtectedRoute } from '@/components/ProtectedRoute'

function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ backgroundImage: 'radial-gradient(ellipse at top right, rgba(255,107,53,0.08) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(34,197,94,0.05) 0%, transparent 50%)' }}>
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="font-heading text-xl tracking-wider text-foreground">FITMANAGER</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-muted hover:text-foreground transition-colors">Iniciar sesión</Link>
          <Link to="/registro" className="text-sm bg-primary text-white px-5 py-2.5 rounded-button font-semibold hover:brightness-110 transition-all duration-200">Comenzar gratis</Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center max-w-7xl mx-auto px-8 w-full">
        <div className="grid md:grid-cols-2 gap-16 items-center w-full py-12">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-primary-light border border-primary/40 text-primary text-xs font-semibold px-4 py-2 rounded-badge tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              PLATAFORMA SAAS PARA GIMNASIOS
            </div>
            <h1 className="font-heading text-6xl md:text-7xl lg:text-8xl leading-none text-foreground">
              ADMINISTRA
              <br />
              TU <span className="text-primary">GIMNASIO</span>
              <br />
              SIN ESFUERZO
            </h1>
            <p className="text-muted text-lg max-w-lg leading-relaxed">
              Centraliza clientes, membresías, pagos y asistencia en un solo lugar. 
              La plataforma todo-en-uno para gimnasios pequeños y medianos.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/registro" className="bg-primary text-white px-8 py-3.5 rounded-button font-semibold hover:brightness-110 transition-all duration-200 text-sm tracking-wide">
                COMENZAR GRATIS
              </Link>
              <Link to="/login" className="text-muted hover:text-foreground transition-colors text-sm font-medium">
                Ya tengo cuenta &rarr;
              </Link>
            </div>
            <div className="flex items-center gap-10 pt-4">
              <div>
                <p className="font-heading text-3xl text-foreground">100+</p>
                <p className="text-muted text-xs tracking-wider">GIMNASIOS ACTIVOS</p>
              </div>
              <div>
                <p className="font-heading text-3xl text-foreground">5K+</p>
                <p className="text-muted text-xs tracking-wider">CLIENTES GESTIONADOS</p>
              </div>
              <div>
                <p className="font-heading text-3xl text-primary">99%</p>
                <p className="text-muted text-xs tracking-wider">DISPONIBILIDAD</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center">
            <div className="w-full max-w-md bg-surface rounded-card border border-border p-8 shadow-2xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-white font-bold">F</span>
                </div>
                <div>
                  <p className="font-heading text-lg text-foreground tracking-wider">HOY</p>
                  <p className="text-muted text-xs">Panel de control</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Clientes activos', value: '128', color: 'text-primary' },
                  { label: 'Membresías activas', value: '94', color: 'text-secondary' },
                  { label: 'Ingresos del mes', value: '₡2.4M', color: 'text-foreground' },
                  { label: 'Asistencias hoy', value: '42', color: 'text-muted' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <p className="text-sm text-muted">{s.label}</p>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-muted mb-2">
                  <span>Progreso del mes</span>
                  <span>68%</span>
                </div>
                <div className="h-2 bg-surface-lighter rounded-full overflow-hidden">
                  <div className="h-full w-[68%] bg-primary rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
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
