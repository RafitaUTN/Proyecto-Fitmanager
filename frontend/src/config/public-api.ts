import { validatePublicApiUrl } from './api-url-policy'

export const PUBLIC_API_URL = validatePublicApiUrl(import.meta.env.VITE_API_URL, import.meta.env.PROD)
