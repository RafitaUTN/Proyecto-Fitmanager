/**
 * Componente funcional PerfilCliente de FitManager.
 *
 * @remarks Encapsula una pieza de UI con comportamiento reutilizable para las páginas del sistema.
 */
import { usePerfilCliente } from '@/hooks/use-perfil-cliente'
import { formatFecha } from '@/lib/fecha'

const badgeEstado: Record<string, string> = {
  activo: 'bg-secondary/10 text-secondary',
  cancelada: 'bg-destructive/10 text-destructive',
  vencida: 'bg-yellow-500/10 text-yellow-400',
}

export function PerfilCliente({ id }: { id: number }) {
  const { data, isLoading, isError } = usePerfilCliente(id)

  if (isLoading) {
    return <div className="text-muted animate-pulse py-12 text-center">Cargando perfil...</div>
  }

  if (isError || !data) {
    return <div className="text-destructive text-center py-12">No se pudo cargar el perfil del cliente.</div>
  }

  const { cliente, membresiaActiva, membresiaVencida, historial } = data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-card p-4 sm:p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Información Personal</h3>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-dark uppercase tracking-wider">Nombre</p>
              <p className="text-foreground font-medium">
                {cliente.nombre} {cliente.apellido}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-dark uppercase tracking-wider">Cédula</p>
              <p className="text-foreground font-medium">{cliente.cedula}</p>
            </div>
            <div>
              <p className="text-xs text-muted-dark uppercase tracking-wider">Correo</p>
              <p className="text-foreground font-medium break-all">{cliente.correo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-dark uppercase tracking-wider">Teléfono</p>
              <p className="text-foreground font-medium">{cliente.telefono || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-dark uppercase tracking-wider">Miembro desde</p>
              <p className="text-foreground font-medium">{formatFecha(cliente.fecha_registro)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-dark uppercase tracking-wider">Entrenador</p>
              <p className="text-foreground font-medium">
                {cliente.entrenador ? `${cliente.entrenador.nombre} ${cliente.entrenador.apellido}` : 'Sin asignar'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-dark uppercase tracking-wider">Estado</p>
              <span
                className={`text-xs px-2.5 py-1 rounded-badge font-medium ${cliente.estado ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}
              >
                {cliente.estado ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-card p-4 sm:p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Membresía</h3>
          {membresiaActiva ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-foreground font-semibold text-lg">{membresiaActiva.plan}</p>
                <span className="text-xs px-2.5 py-1 rounded-badge font-medium bg-secondary/10 text-secondary">
                  Activa
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-dark uppercase tracking-wider">Precio</p>
                  <p className="text-foreground font-medium">₡{membresiaActiva.precio.toLocaleString('es-CR')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-dark uppercase tracking-wider">Días restantes</p>
                  <p className="text-foreground font-medium">{membresiaActiva.diasRestantes} días</p>
                </div>
                <div>
                  <p className="text-xs text-muted-dark uppercase tracking-wider">Inicio</p>
                  <p className="text-foreground font-medium">{formatFecha(membresiaActiva.inicio)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-dark uppercase tracking-wider">Vence</p>
                  <p className="text-foreground font-medium">{formatFecha(membresiaActiva.fin)}</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>Progreso</span>
                  <span>{membresiaActiva.progreso}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-light overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${membresiaActiva.progreso}%` }}
                  />
                </div>
              </div>
            </div>
          ) : membresiaVencida ? (
            <div className="text-sm">
              <p className="text-yellow-400 font-medium mb-1">{membresiaVencida.plan} — vencida</p>
              <p className="text-muted">
                El cliente no tiene una membresía activa. La última venció el {formatFecha(membresiaVencida.fin)}.
              </p>
            </div>
          ) : (
            <p className="text-muted text-sm">El cliente no tiene membresías registradas.</p>
          )}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-card overflow-hidden">
        <div className="desktop-table-adaptive overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th className="text-left p-4 text-muted font-medium">Plan</th>
                <th className="text-left p-4 text-muted font-medium">Precio</th>
                <th className="text-left p-4 text-muted font-medium">Duración</th>
                <th className="text-left p-4 text-muted font-medium">Inicio</th>
                <th className="text-left p-4 text-muted font-medium">Vence</th>
                <th className="text-left p-4 text-muted font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted">
                    Sin historial de membresías
                  </td>
                </tr>
              )}
              {historial.map((h) => (
                <tr key={h.id} className="border-t border-border">
                  <td className="p-4 text-foreground font-medium">{h.plan}</td>
                  <td className="p-4 text-muted">₡{h.precio.toLocaleString('es-CR')}</td>
                  <td className="p-4 text-muted">{h.duracionDias} días</td>
                  <td className="p-4 text-muted">{formatFecha(h.inicio)}</td>
                  <td className="p-4 text-muted">{formatFecha(h.fin)}</td>
                  <td className="p-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-badge font-medium ${badgeEstado[h.estado] || 'bg-surface-light text-muted'}`}
                    >
                      {h.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list space-y-3 p-3">
          {historial.map((h) => (
            <article key={h.id} className="rounded-card border border-border bg-surface-light/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{h.plan}</p>
                  <p className="mt-1 text-xs text-muted">
                    ₡{h.precio.toLocaleString('es-CR')} · {h.duracionDias} días
                  </p>
                  <p className="mt-2 text-xs text-muted">Inicio: {formatFecha(h.inicio)}</p>
                  <p className="mt-1 text-xs text-muted">Vence: {formatFecha(h.fin)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-badge px-2.5 py-1 text-xs font-medium ${badgeEstado[h.estado] || 'bg-surface-light text-muted'}`}
                >
                  {h.estado}
                </span>
              </div>
            </article>
          ))}
          {historial.length === 0 && <p className="py-8 text-center text-sm text-muted">Sin historial de membresías</p>}
        </div>
      </div>
    </div>
  )
}
