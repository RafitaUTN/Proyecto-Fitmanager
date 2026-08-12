export type EmailFlow = 'setup-password' | 'reset-password'

export function buildEmailActionUrl(frontendUrl: string, flow: EmailFlow, token: string): string {
  const base = frontendUrl.trim().replace(/\/+$/, '')
  const url = new URL(`/${flow}`, `${base}/`)
  url.searchParams.set('token', token)
  return url.toString()
}
