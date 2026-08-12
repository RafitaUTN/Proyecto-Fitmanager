const raw = process.env.E2E_DATABASE_URL
if (!raw) throw new Error('E2E_DATABASE_URL es obligatoria')
const url = new URL(raw)
if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(url.hostname) || !url.pathname.toLowerCase().includes('e2e')) {
  throw new Error('Seed E2E bloqueado fuera de una base local/aislada con nombre e2e')
}
process.env.DATABASE_URL = raw

async function run() {
  await import('./seed')
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: raw }) })
  let gym = null
  for (let attempt = 0; attempt < 50 && !gym; attempt += 1) {
    gym = await prisma.gimnasio.findFirst()
    if (!gym) await new Promise((resolve) => setTimeout(resolve, 100))
  }
  if (!gym) throw new Error('El seed base no creó el gimnasio E2E')
  const passwordHash = await bcrypt.hash('123456', 4)
  const trainer = await prisma.usuario.upsert({
    where: { correo: 'entre@fitmanager.com' },
    update: { estado: true, password_hash: passwordHash },
    create: { id_gimnasio: gym.id_gimnasio, nombre: 'Pepito', apellido: 'Díaz', correo: 'entre@fitmanager.com', password_hash: passwordHash, rol: 'Entrenador' },
  })
  await prisma.usuario.upsert({
    where: { correo: 're@fitmanager.com' },
    update: { estado: true, password_hash: passwordHash },
    create: { id_gimnasio: gym.id_gimnasio, nombre: 'Recepción', apellido: 'E2E', correo: 're@fitmanager.com', password_hash: passwordHash, rol: 'Recepcionista' },
  })
  await prisma.cliente.upsert({
    where: { correo: 'pablo@e2e.test' },
    update: { estado: true },
    create: { id_gimnasio: gym.id_gimnasio, nombre: 'Pablo', apellido: 'Pruebas', cedula: 'E2E-PABLO', correo: 'pablo@e2e.test' },
  })
  const fernando = await prisma.cliente.upsert({
    where: { correo: 'fernando@e2e.test' },
    update: { estado: true, id_entrenador: trainer.id_usuario },
    create: { id_gimnasio: gym.id_gimnasio, id_entrenador: trainer.id_usuario, nombre: 'Fernando', apellido: 'Flores', cedula: 'E2E-FERNANDO', correo: 'fernando@e2e.test' },
  })

  const plan = await prisma.membresia.findFirst({ where: { id_gimnasio: gym.id_gimnasio, estado: true } })
  if (!plan) throw new Error('El seed E2E requiere al menos una membresía activa')
  const membresiaActiva = await prisma.clienteMembresia.findFirst({
    where: { id_cliente: fernando.id_cliente, estado: 'activo' },
  })
  if (!membresiaActiva) {
    const fechaInicio = new Date()
    fechaInicio.setUTCHours(0, 0, 0, 0)
    const fechaFin = new Date(fechaInicio)
    fechaFin.setUTCDate(fechaFin.getUTCDate() + plan.duracion_dias)
    await prisma.clienteMembresia.create({
      data: {
        id_cliente: fernando.id_cliente,
        id_membresia: plan.id_membresia,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        monto_adeudado: plan.precio,
        fecha_pago_habilitada: fechaInicio,
        fecha_vencimiento_pago: fechaFin,
        estado: 'activo',
      },
    })
  }
  await prisma.$disconnect()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
import bcrypt from 'bcrypt'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
