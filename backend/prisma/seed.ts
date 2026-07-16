import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const gym = await prisma.gimnasio.create({
    data: {
      nombre: 'FitManager Gym Central',
      correo: 'info@fitmanager.com',
      telefono: '8888-8888',
      direccion: 'Alajuela, Costa Rica',
    },
  })

  await prisma.usuario.create({
    data: {
      id_gimnasio: gym.id_gimnasio,
      nombre: 'Carlos',
      apellido: 'Ramírez',
      correo: 'admin@fitmanager.com',
      password_hash: 'hashed_pw_1',
      rol: 'Administrador',
    },
  })

  await prisma.usuario.createMany({
    data: [
      { id_gimnasio: gym.id_gimnasio, nombre: 'Sofía', apellido: 'Vargas', correo: 'svargas@fitmanager.com', password_hash: 'hashed_pw_2', rol: 'Entrenador' },
      { id_gimnasio: gym.id_gimnasio, nombre: 'Diego', apellido: 'Mora', correo: 'dmora@fitmanager.com', password_hash: 'hashed_pw_3', rol: 'Entrenador' },
    ],
  })

  await prisma.cliente.createMany({
    data: [
      { id_gimnasio: gym.id_gimnasio, nombre: 'Juan', apellido: 'Pérez', cedula: '123456789', telefono: '88881111', correo: 'juan@email.com', fecha_nacimiento: new Date('1998-04-15') },
      { id_gimnasio: gym.id_gimnasio, nombre: 'María', apellido: 'González', cedula: '234567890', telefono: '88882222', correo: 'maria@email.com', fecha_nacimiento: new Date('2000-09-22') },
      { id_gimnasio: gym.id_gimnasio, nombre: 'Luis', apellido: 'Solís', cedula: '345678901', telefono: '88883333', correo: 'luis@email.com', fecha_nacimiento: new Date('1995-01-30') },
    ],
  })

  await prisma.membresia.createMany({
    data: [
      { id_gimnasio: gym.id_gimnasio, nombre: 'Básica', descripcion: 'Acceso en horario regular', precio: 15.00, duracion_dias: 30 },
      { id_gimnasio: gym.id_gimnasio, nombre: 'Premium', descripcion: 'Acceso completo + clases grupales', precio: 35.00, duracion_dias: 30 },
      { id_gimnasio: gym.id_gimnasio, nombre: 'Trimestral', descripcion: 'Acceso completo por 3 meses', precio: 90.00, duracion_dias: 90 },
    ],
  })

  await prisma.ejercicio.createMany({
    data: [
      { nombre: 'Press de banca', grupo_muscular: 'Pecho', descripcion: 'Ejercicio de empuje horizontal con barra o mancuernas.' },
      { nombre: 'Sentadilla', grupo_muscular: 'Piernas', descripcion: 'Ejercicio compuesto de tren inferior con barra en espalda.' },
      { nombre: 'Peso muerto', grupo_muscular: 'Espalda baja', descripcion: 'Levantamiento de barra desde el suelo hasta posición erguida.' },
    ],
  })

  console.log('Seed completed')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
