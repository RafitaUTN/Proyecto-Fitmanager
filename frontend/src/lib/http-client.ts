import { useAuthStore } from '@/store/auth.store'
import { getCsrfToken } from '@/lib/csrf'

const BASE_URL = import.meta.env.VITE_API_URL

if (!BASE_URL) {
  throw new Error('VITE_API_URL no está definida. Crea frontend/.env con VITE_API_URL=http://localhost:3000/api')
}

export class HttpClientError extends Error {
  status: number
  body?: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'HttpClientError'
    this.status = status
    this.body = body
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

async function request<T>(method: Method, path: string, options?: {
  body?: unknown
  params?: Record<string, string>
  signal?: AbortSignal
}, retried = false): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {}

  if (token) headers['Authorization'] = `Bearer ${token}`
  const csrfToken = getCsrfToken()
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken

  const url = new URL(`${BASE_URL}${path}`)
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const isFormData = options?.body instanceof FormData
  if (options?.body && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: isFormData ? (options.body as FormData) : options?.body ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
    credentials: 'include',
  })

  const text = await res.text()
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { parsed = text }

  if (res.status === 401 && token && !retried && !path.startsWith('/auth/')) {
    const refreshed = await useAuthStore.getState().refresh()
    if (refreshed) return request<T>(method, path, options, true)
  }

  if (!res.ok) {
    const message = (parsed as any)?.error || `Error del servidor (${res.status})`
    throw new HttpClientError(message, res.status, parsed)
  }

  return parsed as T
}

export const http = {
  get: <T>(path: string, params?: Record<string, string>, signal?: AbortSignal) =>
    request<T>('GET', path, { params, signal }),

  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>('POST', path, { body, signal }),

  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>('PUT', path, { body, signal }),

  delete: <T>(path: string, signal?: AbortSignal) =>
    request<T>('DELETE', path, { signal }),
  del: <T>(path: string, signal?: AbortSignal) =>
    request<T>('DELETE', path, { signal }),
}
