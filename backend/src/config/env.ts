import 'dotenv/config'
import { resolveFrontendUrl } from './public-url'

const REQUERIDAS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const
const OPCIONALES = ['RESEND_API_KEY', 'EMAIL_FROM', 'EMAIL_DEV_OVERRIDE', 'FRONTEND_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'CRON_SECRET', 'EXERCISE_MEDIA_BASE_URL', 'EXERCISE_MEDIA_TIMEOUT_MS', 'EXERCISE_MEDIA_CACHE_TTL_MS', 'EXERCISE_MEDIA_ENABLED'] as const

function parseSameSite(value: string | undefined): 'lax' | 'strict' | 'none' {
  const normalized = value?.toLowerCase()
  if (normalized === 'lax' || normalized === 'strict' || normalized === 'none') return normalized
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax'
}

export function parseTrustProxy(value: string | undefined): number | false {
  const trimmed = value?.trim()
  if (trimmed === undefined || trimmed === '') {
    return process.env.NODE_ENV === 'production' ? 1 : false
  }
  const normalized = trimmed.toLowerCase()
  if (normalized === 'false' || normalized === '0') return false
  if (normalized === 'true') return 1
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : false
}

function requerir(variable: string): string {
  const valor = process.env[variable]
  if (!valor) {
    throw new Error(`[env] Variable requerida faltante: ${variable}`)
  }
  return valor
}

export function validarEntorno(): void {
  const faltantes: string[] = []
  for (const v of REQUERIDAS) {
    if (!process.env[v]) {
      faltantes.push(v)
    }
  }
  if (faltantes.length > 0) {
    const lista = faltantes.map((v) => `  • ${v}`).join('\n')
    console.error([
      '',
      '═══════════════════════════════════════════════════',
      '  ERROR DE CONFIGURACIÓN',
      '',
      '  Faltan variables de entorno requeridas:',
      '',
      `${lista}`,
      '',
      '  Crea o actualiza backend/.env con los valores de tu entorno.',
      '',
      '  O, si usas Docker, asegúrate de que exista un archivo .env en la raíz',
      '  del proyecto con las variables definidas.',
      '═══════════════════════════════════════════════════',
      '',
    ].join('\n'))
    process.exit(1)
  }
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: requerir('DATABASE_URL'),
  jwtSecret: requerir('JWT_SECRET'),
  jwtRefreshSecret: requerir('JWT_REFRESH_SECRET'),
  frontendUrl: resolveFrontendUrl(process.env.NODE_ENV, process.env.FRONTEND_URL),
  previewOriginSuffix: process.env.PREVIEW_ORIGIN_SUFFIX || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  cookieSameSite: parseSameSite(process.env.COOKIE_SAME_SITE),
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  appEnv: process.env.APP_ENV || 'development',
  activeEmailProvider: (process.env.ACTIVE_EMAIL_PROVIDER || 'gmail') as 'gmail' | 'resend',
  emailDeliveryEnabled: process.env.EMAIL_DELIVERY_ENABLED !== 'false',
  cronSecret: process.env.CRON_SECRET || '',

  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || '',
  emailDevOverride: process.env.EMAIL_DEV_OVERRIDE || '',

  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',

  exerciseMediaBaseUrl: process.env.EXERCISE_MEDIA_BASE_URL || 'https://wger.de',
  exerciseMediaEnabled: process.env.EXERCISE_MEDIA_ENABLED !== 'false',
  exerciseMediaTimeoutMs: Number(process.env.EXERCISE_MEDIA_TIMEOUT_MS) || 6000,
  exerciseMediaCacheTtlMs: Number(process.env.EXERCISE_MEDIA_CACHE_TTL_MS) || 7 * 24 * 60 * 60 * 1000,
}
