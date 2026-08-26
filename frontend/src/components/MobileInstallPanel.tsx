import { Download, ExternalLink, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react'
import { useMobileInstall } from '../hooks/use-mobile-install'

const DEFAULT_ANDROID_APK_URL = '/downloads/fitmanager-android.apk'

const androidApkUrl = import.meta.env.VITE_ANDROID_APK_URL || DEFAULT_ANDROID_APK_URL
const mobileWebUrl = import.meta.env.VITE_MOBILE_WEB_URL || window.location.origin

/**
 * Muestra la opción de instalación más adecuada según el dispositivo actual.
 *
 * @remarks Android ofrece APK/Capacitor y PWA; iOS usa instalación PWA porque Apple no permite instalación nativa pública sin App Store.
 */
export function MobileInstallPanel() {
  const { platform, canInstallPwa, isStandalone, installPwa } = useMobileInstall()

  const platformLabel = platform === 'android' ? 'Android' : platform === 'ios' ? 'iOS' : 'Web'

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border bg-surface/80 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-black/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.10),transparent_32%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Smartphone size={15} />
            App móvil FitManager
          </span>

          <div className="space-y-3">
            <h2 className="font-heading text-4xl tracking-wider text-foreground sm:text-5xl lg:text-6xl">
              INSTALA FITMANAGER EN TU CELULAR
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-muted">
              La app móvil conserva la misma lógica del SaaS: usuarios, clientes, pagos, membresías, asistencias, rutinas,
              notificaciones y reportes. Cuando se publique una mejora en la versión web, el móvil puede recibirla sin
              reconstruir la lógica de negocio.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: RefreshCw, title: 'Actualizable', text: 'Recibe cambios del frontend desplegado.' },
              { icon: ShieldCheck, title: 'Seguro', text: 'Mantiene JWT, cookies y CSRF existentes.' },
              { icon: Download, title: 'Sin tienda', text: 'Android por APK; iOS mediante Safari.' },
            ].map((item) => (
              <div key={item.title} className="rounded-card border border-border bg-background/45 p-4">
                <item.icon className="mb-3 text-primary" size={22} />
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-background/70 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Instalación detectada</p>
              <p className="text-xs text-muted">Dispositivo actual: {platformLabel}</p>
            </div>
            {isStandalone && (
              <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-300">
                Instalada
              </span>
            )}
          </div>

          <div className="space-y-3">
            {platform === 'android' && (
              <a
                href={androidApkUrl}
                download
                className="flex w-full items-center justify-center gap-2 rounded-button bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
              >
                <Download size={17} />
                Descargar app Android
              </a>
            )}

            {canInstallPwa && (
              <button
                type="button"
                onClick={() => void installPwa()}
                className="flex w-full items-center justify-center gap-2 rounded-button border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary/15"
              >
                <Smartphone size={17} />
                Instalar acceso móvil
              </button>
            )}

            <a
              href={mobileWebUrl}
              className="flex w-full items-center justify-center gap-2 rounded-button border border-border bg-white/5 px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white/10"
            >
              <ExternalLink size={17} />
              Abrir versión móvil web
            </a>
          </div>

          <div className="mt-5 rounded-card border border-border bg-surface/70 p-4 text-xs leading-relaxed text-muted">
            {platform === 'ios' ? (
              <p>
                En iPhone/iPad abre FitManager en Safari, toca Compartir y selecciona “Agregar a pantalla de inicio”.
                Esa es la vía sin App Store compatible con iOS.
              </p>
            ) : (
              <p>
                Para Android, el APK se descarga directamente desde FitManager. Si el navegador permite instalación PWA,
                también verás el botón de acceso móvil.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
