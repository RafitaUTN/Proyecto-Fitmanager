/**
 * Utilidad frontend csrf.
 *
 * @remarks Centraliza lógica compartida por páginas, hooks o componentes del cliente web.
 */
let csrfToken: string | null = null

export function setCsrfToken(token: string | null): void {
  csrfToken = token
}

export function getCsrfToken(): string | null {
  return csrfToken
}
