import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useClientePerfil, useClienteMembresia } from '@/hooks/use-cliente-portal'

const icons = {
  card: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  dumbbell: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11v11h-11z"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6 2h1l1 4H6z"/><path d="M6 18h1l1 4H6z"/><path d="M17 2h-1l-1 4h2z"/><path d="M17 18h-1l-1 4h2z"/></svg>,
  user: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>,
}

export function ClienteInicio() {
  const { cliente } = useAuthStore()
  const { data: perfil, isLoading: loadingPerfil } = useClientePerfil()
  const { data: membresia, isLoading: loadingMembresia } = useClienteMembresia()

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-foreground tracking-wider leading-none" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>
          BIENVENIDO, {cliente?.nombre?.toUpperCase()}
        </h1>
        <p className="text-lg text-muted mt-2">Panel de cliente</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-card p-5">
          <div className="flex items-center gap-3 text-muted-dark text-sm font-medium mb-3">
            <span className="text-primary">{icons.card}</span>
            Membresía
          </div>
          {loadingMembresia ? (
            <div className="text-muted animate-pulse">Cargando...</div>
          ) : membresia ? (
            <div>
              <p className="text-xl font-bold text-foreground">{membresia.plan.nombre}</p>
              <p className={`text-sm mt-1 ${membresia.estado === 'activo' ? 'text-green-400' : 'text-destructive'}`}>
                {membresia.estado === 'activo' ? 'Activa' : membresia.estado}
              </p>
              {membresia.estado === 'activo' && (
                <div className="mt-3">
                  <div className="w-full bg-surface-light rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(membresia.progreso, 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-dark mt-1">{membresia.dias_restantes} días restantes</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted text-sm">Sin membresía activa</p>
          )}
        </div>

        <div className="bg-surface border border-border rounded-card p-5">
          <div className="flex items-center gap-3 text-muted-dark text-sm font-medium mb-3">
            <span className="text-primary">{icons.user}</span>
            Entrenador
          </div>
          {loadingPerfil ? (
            <div className="text-muted animate-pulse">Cargando...</div>
          ) : perfil?.entrenador ? (
            <div>
              <p className="text-xl font-bold text-foreground">{perfil.entrenador.nombre} {perfil.entrenador.apellido}</p>
              <p className="text-sm text-muted mt-1">{perfil.nombre_gimnasio}</p>
            </div>
          ) : (
            <div>
              <p className="text-muted text-sm">Sin entrenador asignado</p>
              <p className="text-xs text-muted-dark mt-1">{perfil?.nombre_gimnasio}</p>
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-card p-5">
          <div className="flex items-center gap-3 text-muted-dark text-sm font-medium mb-3">
            <span className="text-primary">{icons.user}</span>
            Perfil
          </div>
          <p className="text-sm text-foreground font-medium">{cliente?.nombre} {cliente?.apellido}</p>
          <p className="text-sm text-muted mt-1">{cliente?.correo}</p>
        </div>
      </div>
    </div>
  )
}