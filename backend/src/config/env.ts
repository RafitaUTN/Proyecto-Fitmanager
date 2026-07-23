import 'dotenv/config'

function requerir(variable: string, fallback?: string): string {
  const valor = process.env[variable] || fallback
  if (!valor) {
    throw new Error(`Variable de entorno requerida: ${variable}`)
  }
  return valor
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: requerir('DATABASE_URL', process.env.NODE_ENV === 'production' ? undefined : 'postgresql://fitmanager:fitmanager_secret@localhost:5432/fitmanager'),
  jwtSecret: requerir('JWT_SECRET', 'dev_jwt_secret_key_2026'),
  jwtRefreshSecret: requerir('JWT_REFRESH_SECRET', 'dev_refresh_secret_key_2026'),
  frontendUrl: requerir('FRONTEND_URL', 'http://localhost:5173'),
  nodeEnv: process.env.NODE_ENV || 'development',
}
