import { prisma } from './lib/prisma'
import app from './app'
import { env } from './config/env'

async function main() {
  try {
    await prisma.$connect()
    console.log('✓ Base de datos conectada')
  } catch (error) {
    console.error('✗ Error conectando a la base de datos:', error)
    process.exit(1)
  }

  app.listen(env.port, () => {
    console.log(`Backend running on http://localhost:${env.port} [${env.nodeEnv}]`)
  })
}

main()
