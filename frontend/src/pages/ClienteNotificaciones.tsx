import { Bell, CreditCard, Dumbbell, ShieldCheck } from 'lucide-react'
import { useClienteNotificaciones, useMarcarClienteNotificacion, type ClienteNotificacion } from '@/hooks/use-cliente-portal'

function relativo(fecha: string) {
  const minutos = Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 60000))
  if (minutos < 1) return 'Ahora'
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`
  return `Hace ${Math.floor(horas / 24)} d`
}

function Icono({ notificacion }: { notificacion: ClienteNotificacion }) {
  const text = `${notificacion.titulo} ${notificacion.mensaje}`.toLowerCase()
  const Icon = text.includes('pago') ? CreditCard : text.includes('rutina') ? Dumbbell : text.includes('contraseña') ? ShieldCheck : Bell
  return <Icon size={20} aria-hidden="true" />
}

export function ClienteNotificaciones() {
  const { data, isLoading, error } = useClienteNotificaciones()
  const marcar = useMarcarClienteNotificacion()
  return <div className="space-y-6">
    <div>
      <h1 className="font-heading text-foreground tracking-wider leading-none" style={{ fontSize: 'clamp(36px, 3vw, 52px)' }}>NOTIFICACIONES</h1>
      <p className="text-muted mt-2">Novedades personales sobre tu membresía, pagos, seguridad y rutinas.</p>
    </div>
    {isLoading && <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-card bg-surface border border-border animate-pulse" />)}</div>}
    {error && <div role="alert" className="rounded-card border border-destructive/30 bg-destructive/10 p-4 text-destructive">No fue posible cargar tus notificaciones.</div>}
    {!isLoading && data?.length === 0 && <div className="rounded-card border border-border bg-surface p-10 text-center"><Bell className="mx-auto text-muted-dark" aria-hidden="true" /><p className="text-muted mt-3">No tienes notificaciones.</p></div>}
    <div className="space-y-3">
      {data?.map((notificacion) => <article key={notificacion.id_notificacion} className={`rounded-card border bg-surface p-4 ${notificacion.leida ? 'border-border' : 'border-primary/50 shadow-[inset_3px_0_0_#F97316]'}`}>
        <div className="flex items-start gap-3">
          <span className="rounded-button bg-primary/10 text-primary p-2"><Icono notificacion={notificacion} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3"><h2 className="text-sm font-semibold text-foreground">{notificacion.titulo}</h2><time className="text-xs text-muted-dark shrink-0" dateTime={notificacion.fecha_envio}>{relativo(notificacion.fecha_envio)}</time></div>
            <p className="text-sm text-muted mt-1">{notificacion.mensaje}</p>
            {!notificacion.leida && <button onClick={() => marcar.mutate(notificacion.id_notificacion)} disabled={marcar.isPending} className="text-xs text-primary hover:underline mt-2 disabled:opacity-50">Marcar como leída</button>}
          </div>
        </div>
      </article>)}
    </div>
  </div>
}
