import 'dotenv/config'

const REQUERIDAS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const
const OPCIONALES = ['RESEND_API_KEY'] as const

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
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  resendApiKey: process.env.RESEND_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
}
