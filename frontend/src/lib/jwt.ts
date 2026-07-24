export interface JwtPayload {
  id_usuario: number
  id_gimnasio: number
  rol: string
  iat: number
  exp: number
}

export function decodificarToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (typeof decoded.exp !== 'number') return null
    return decoded as JwtPayload
  } catch {
    return null
  }
}

export function tokenExpirado(token: string): boolean {
  const payload = decodificarToken(token)
  if (!payload) return true
  return Date.now() >= payload.exp * 1000
}

export function tokenValido(token: string): boolean {
  const payload = decodificarToken(token)
  if (!payload) return false
  return Date.now() < payload.exp * 1000
}
