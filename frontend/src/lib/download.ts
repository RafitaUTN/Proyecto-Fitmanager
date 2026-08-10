import { useAuthStore } from '@/store/auth.store'
import { PUBLIC_API_URL } from '@/config/public-api'

const BASE_URL = PUBLIC_API_URL

export async function fetchConRefresh(url: string, init?: RequestInit): Promise<Response> {
  const token = useAuthStore.getState().token
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(url, { ...init, headers, credentials: 'include' })

  if (res.status === 401 && token) {
    const refreshed = await useAuthStore.getState().refresh()
    if (refreshed) {
      const nuevoToken = useAuthStore.getState().token
      const nuevosHeaders = new Headers(init?.headers)
      if (nuevoToken) nuevosHeaders.set('Authorization', `Bearer ${nuevoToken}`)
      return fetch(url, { ...init, headers: nuevosHeaders, credentials: 'include' })
    }
  }

  return res
}

export async function downloadReport(tipo: string, fecha_inicio?: string, fecha_fin?: string, formato: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<boolean> {
  const gym = useAuthStore.getState().usuario?.nombre_gimnasio || ''
  let url = `${BASE_URL}/reportes/exportar?tipo=${tipo}&formato=${formato}&nombre_gimnasio=${encodeURIComponent(gym)}`
  if (fecha_inicio) url += `&fecha_inicio=${fecha_inicio}`
  if (fecha_fin) url += `&fecha_fin=${fecha_fin}`
  const ext = formato === 'pdf' ? 'pdf' : formato === 'xlsx' ? 'xlsx' : 'csv'
  const a = document.createElement('a')
  a.setAttribute('download', `${tipo}-${new Date().toISOString().split('T')[0]}.${ext}`)
  a.style.display = 'none'
  document.body.appendChild(a)
  try {
    const res = await fetchConRefresh(url)
    if (!res.ok) throw new Error('Error al exportar')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    a.href = blobUrl
    a.click()
    URL.revokeObjectURL(blobUrl)
    return true
  } catch {
    return false
  } finally {
    document.body.removeChild(a)
  }
}
