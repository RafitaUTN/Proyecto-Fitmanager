// Formatea fechas de calendario (columnas DATE en PostgreSQL) sin el corrimiento
// de zona horaria que sufre `new Date('YYYY-MM-DDT00:00:00.000Z')` en América Central.
// El backend serializa las fechas tipo `date` a medianoche UTC; aquí se extrae la
// parte YYYY-MM-DD y se interpreta como fecha local para evitar el día anterior.

function aParteFecha(iso: string | Date | null | undefined): string | null {
  if (iso == null || iso === '') return null
  const s = iso instanceof Date ? iso.toISOString() : String(iso)
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? match[0] : null
}

function aFechaLocal(iso: string | Date | null | undefined): Date | null {
  const parte = aParteFecha(iso)
  if (!parte) return null
  const [y, m, d] = parte.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export function formatFecha(iso: string | Date | null | undefined, locale = 'es-CR'): string {
  const fecha = aFechaLocal(iso)
  return fecha ? fecha.toLocaleDateString(locale) : '-'
}

export function formatMes(iso: string | Date | null | undefined): string {
  const fecha = aFechaLocal(iso)
  return fecha ? fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }) : ''
}

export function formatDia(iso: string | Date | null | undefined): string {
  const fecha = aFechaLocal(iso)
  return fecha ? fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : ''
}

// El gimnasio decide el día de calendario en Costa Rica, no en la zona del
// navegador ni en UTC. Replica `businessDateKey` de `payment-balance.ts`.
const ZONA_NEGOCIO = 'America/Costa_Rica'

const formateadorDiaNegocio = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_NEGOCIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function diaNegocioActual(ahora: Date = new Date()): string {
  const partes = Object.fromEntries(
    formateadorDiaNegocio.formatToParts(ahora).map((parte) => [parte.type, parte.value]),
  )
  return `${partes.year}-${partes.month}-${partes.day}`
}

// Una fecha de vigencia está vencida cuando su día de calendario quedó atrás
// respecto del día de negocio actual. El propio día de vencimiento no lo está.
export function esFechaVencida(iso: string | Date | null | undefined, ahora: Date = new Date()): boolean {
  const parte = aParteFecha(iso)
  if (!parte) return false
  return parte < diaNegocioActual(ahora)
}
