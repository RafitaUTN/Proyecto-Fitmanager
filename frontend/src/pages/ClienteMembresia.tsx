import { useClienteMembresia } from '@/hooks/use-cliente-portal'

export function ClienteMembresia() {
  const { data, isLoading, error } = useClienteMembresia()

  if (isLoading) {
    return (
      <div>
        <h1 className="font-heading text-foreground tracking-wider leading-none mb-8" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>MI MEMBRESÍA</h1>
        <div className="text-muted animate-pulse">Cargando información de membresía...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-foreground tracking-wider leading-none mb-8" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>MI MEMBRESÍA</h1>
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-5 py-3 rounded-button">
          Error al cargar la membresía. Intenta de nuevo más tarde.
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <h1 className="font-heading text-foreground tracking-wider leading-none mb-8" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>MI MEMBRESÍA</h1>
        <div className="bg-surface border border-border rounded-card p-8 text-center">
          <p className="text-muted text-lg">No tienes una membresía activa.</p>
          <p className="text-muted-dark text-sm mt-2">Contacta a tu gimnasio para adquirir una.</p>
        </div>
      </div>
    )
  }

  const plan = data.plan

  return (
    <div>
      <h1 className="font-heading text-foreground tracking-wider leading-none mb-8" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>MI MEMBRESÍA</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-surface border border-border rounded-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{plan.nombre}</h2>
              <p className="text-muted-dark mt-1">{plan.descripcion}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              data.estado === 'activo'
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : 'bg-destructive/10 text-destructive border border-destructive/30'
            }`}>
              {data.estado === 'activo' ? 'Activa' : data.estado}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-surface-light rounded-lg p-3">
              <p className="text-xs text-muted-dark">Precio</p>
              <p className="text-lg font-bold text-foreground">₡{plan.precio?.toLocaleString()}</p>
            </div>
            <div className="bg-surface-light rounded-lg p-3">
              <p className="text-xs text-muted-dark">Duración</p>
              <p className="text-lg font-bold text-foreground">{plan.duracion_dias} días</p>
            </div>
            <div className="bg-surface-light rounded-lg p-3">
              <p className="text-xs text-muted-dark">Inicio</p>
              <p className="text-sm font-bold text-foreground">{new Date(data.fecha_inicio).toLocaleDateString()}</p>
            </div>
            <div className="bg-surface-light rounded-lg p-3">
              <p className="text-xs text-muted-dark">Vence</p>
              <p className={`text-sm font-bold ${data.dias_restantes <= 7 ? 'text-destructive' : 'text-foreground'}`}>
                {new Date(data.fecha_fin).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted">Progreso</span>
              <span className="text-muted-dark">{Math.round(data.progreso)}%</span>
            </div>
            <div className="w-full bg-surface-light rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${data.dias_restantes <= 7 ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${Math.min(data.progreso, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-dark mt-1.5">
              {data.dias_restantes > 0
                ? `${data.dias_restantes} días restantes`
                : 'Membresía vencida'}
            </p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-card p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Resumen de pago</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Plan</span>
              <span className="text-foreground font-medium">{plan.nombre}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Estado</span>
              <span className={data.estado === 'activo' ? 'text-green-400' : 'text-destructive'}>
                {data.estado === 'activo' ? 'Activa' : data.estado}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Total</span>
              <span className="text-foreground font-medium">₡{data.pago.monto_total.toLocaleString('es-CR')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Pagado</span>
              <span className="text-green-400 font-medium">₡{data.pago.monto_pagado.toLocaleString('es-CR')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Pendiente</span>
              <span className={data.pago.saldo_pendiente > 0 ? 'text-primary font-semibold' : 'text-green-400 font-semibold'}>₡{data.pago.saldo_pendiente.toLocaleString('es-CR')}</span>
            </div>
            <div className={`rounded-button p-3 text-sm ${data.pago.estado_pago === 'COMPLETADO' ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'}`}>
              <p className="font-semibold">{data.pago.estado_pago === 'COMPLETADO' ? 'Pago completado' : 'Pago pendiente'}</p>
              {data.pago.saldo_pendiente > 0 && <p className="text-xs mt-1">Tienes un saldo pendiente de ₡{data.pago.saldo_pendiente.toLocaleString('es-CR')} correspondiente a {plan.nombre}.</p>}
            </div>
            <div className="border-t border-border pt-3 mt-3">
              <p className="text-xs text-muted-dark text-center">
                ¿Necesitas ayuda con tu membresía? Contacta al gimnasio.
              </p>
            </div>
          </div>
        </div>
      </div>

      {data.historial && data.historial.length > 0 && (
        <div className="bg-surface border border-border rounded-card p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Historial de Membresías</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-dark border-b border-border">
                  <th className="text-left py-2 px-3 font-medium">Plan</th>
                  <th className="text-left py-2 px-3 font-medium">Inicio</th>
                  <th className="text-left py-2 px-3 font-medium">Fin</th>
                  <th className="text-left py-2 px-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.historial.map((h) => (
                  <tr key={h.id} className="border-b border-border/50 hover:bg-surface-light/50 transition-colors">
                    <td className="py-2.5 px-3 text-foreground">{h.plan}</td>
                    <td className="py-2.5 px-3 text-muted">{new Date(h.fecha_inicio).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 text-muted">{new Date(h.fecha_fin).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        h.estado === 'activo'
                          ? 'bg-green-500/10 text-green-400'
                          : h.estado === 'cancelada'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {h.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
