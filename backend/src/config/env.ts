import 'dotenv/config'

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET || 'fallback_dev_secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_dev_refresh_secret',
  nodeEnv: process.env.NODE_ENV || 'development',
}
