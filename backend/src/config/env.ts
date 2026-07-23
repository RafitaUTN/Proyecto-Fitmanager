import 'dotenv/config'

function requerir(variable: string): string {
  const valor = process.env[variable]
  if (!valor) {
    throw new Error(`Variable de entorno requerida: ${variable}`)
  }
  return valor
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: requerir('DATABASE_URL'),
  jwtSecret: requerir('JWT_SECRET'),
  jwtRefreshSecret: requerir('JWT_REFRESH_SECRET'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
}
