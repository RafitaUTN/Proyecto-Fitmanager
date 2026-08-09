import { getCsrfToken } from './csrf'

const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  throw new Error('VITE_API_URL no está definida. Crea frontend/.env con VITE_API_URL=http://localhost:3000/api')
}

interface ApiError {
  error: string
  codigo?: string
}

export class ApiRequestError extends Error {
  codigo?: string
  status: number

  constructor(message: string, status: number, codigo?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.codigo = codigo
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const csrfToken = getCsrfToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' })) as ApiError
    throw new ApiRequestError(err.error || `HTTP ${res.status}`, res.status, err.codigo)
  }
  return res.json()
}

export async function apiPostAuthorized<T>(path: string, body: unknown, token: string): Promise<T> {
  const csrfToken = getCsrfToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' })) as ApiError
    throw new ApiRequestError(err.error || `HTTP ${res.status}`, res.status, err.codigo)
  }
  return res.json()
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, { headers, credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' })) as ApiError
    throw new ApiRequestError(err.error || `HTTP ${res.status}`, res.status, err.codigo)
  }
  return res.json()
}
