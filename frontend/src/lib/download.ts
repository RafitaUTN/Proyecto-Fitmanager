import { useAuthStore } from '@/store/auth.store'

const BASE_URL = import.meta.env.VITE_API_URL

export function downloadReport(tipo: string, fecha_inicio?: string, fecha_fin?: string, formato: 'csv' | 'xlsx' | 'pdf' = 'csv') {
  const token = useAuthStore.getState().token
  const gym = useAuthStore.getState().usuario?.nombre_gimnasio || ''
  let url = `${BASE_URL}/reportes/exportar?tipo=${tipo}&formato=${formato}&nombre_gimnasio=${encodeURIComponent(gym)}`
  if (fecha_inicio) url += `&fecha_inicio=${fecha_inicio}`
  if (fecha_fin) url += `&fecha_fin=${fecha_fin}`
  const ext = formato === 'pdf' ? 'pdf' : formato === 'xlsx' ? 'xlsx' : 'csv'
  const a = document.createElement('a')
  a.href = url
  a.setAttribute('download', `${tipo}-${new Date().toISOString().split('T')[0]}.${ext}`)
  a.style.display = 'none'
  document.body.appendChild(a)
  fetch(url, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
    .then((res) => {
      if (!res.ok) throw new Error('Error al exportar')
      return res.blob()
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob)
      a.href = blobUrl
      a.click()
      URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
    })
    .catch(() => {
      document.body.removeChild(a)
    })
}
