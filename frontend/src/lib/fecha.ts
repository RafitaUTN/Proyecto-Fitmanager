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
