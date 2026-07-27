import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const gym = await prisma.gimnasio.findFirst()
  if (!gym) {
    console.log('Ejecute seed principal primero (seed.ts)')
    return
  }

  const existingEjercicios = await prisma.ejercicio.count()
  if (existingEjercicios > 3) {
    console.log('Seed Sprint 3 ya ejecutado, saltando...')
    return
  }

  // Ejercicios adicionales
  const ejerciciosExtra = [
    { nombre: 'Press inclinado mancuernas', grupo_muscular: 'Pecho', nivel: 'intermedio', categoria: 'fuerza' },
    { nombre: 'Aperturas con mancuerna', grupo_muscular: 'Pecho', nivel: 'intermedio', categoria: 'fuerza' },
    { nombre: 'Prensa de piernas', grupo_muscular: 'Piernas', nivel: 'intermedio', categoria: 'fuerza' },
    { nombre: 'Extensiones cuadriceps', grupo_muscular: 'Piernas', nivel: 'principiante', categoria: 'fuerza' },
    { nombre: 'Curl femoral acostado', grupo_muscular: 'Piernas', nivel: 'intermedio', categoria: 'fuerza' },
    { nombre: 'Remo con barra', grupo_muscular: 'Espalda', nivel: 'intermedio', categoria: 'fuerza' },
    { nombre: 'Dominadas asistidas', grupo_muscular: 'Espalda', nivel: 'principiante', categoria: 'fuerza' },
    { nombre: 'Jalón al pecho', grupo_muscular: 'Espalda', nivel: 'principiante', categoria: 'fuerza' },
    { nombre: 'Press militar barra', grupo_muscular: 'Hombros', nivel: 'intermedio', categoria: 'fuerza' },
    { nombre: 'Elevaciones laterales', grupo_muscular: 'Hombros', nivel: 'principiante', categoria: 'fuerza' },
    { nombre: 'Curl bíceps barra', grupo_muscular: 'Brazos', nivel: 'principiante', categoria: 'fuerza' },
    { nombre: 'Tríceps en polea', grupo_muscular: 'Brazos', nivel: 'principiante', categoria: 'fuerza' },
    { nombre: 'Plancha abdominal', grupo_muscular: 'Core', nivel: 'principiante', categoria: 'core' },
  ]

  for (const ej of ejerciciosExtra) {
    const exists = await prisma.ejercicio.findFirst({ where: { nombre: ej.nombre, id_gimnasio: gym.id_gimnasio } })
    if (!exists) {
      await prisma.ejercicio.create({ data: { ...ej, id_gimnasio: gym.id_gimnasio } })
    }
  }

  const todosEjercicios = await prisma.ejercicio.findMany({ orderBy: { id_ejercicio: 'asc' } })
  const todosUsuarios = await prisma.usuario.findMany({ where: { id_gimnasio: gym.id_gimnasio } })
  const entrenadores = todosUsuarios.filter((u) => u.rol === 'Entrenador')
  const todosClientes = await prisma.cliente.findMany({ where: { id_gimnasio: gym.id_gimnasio, estado: true } })

  // Crear rutinas con ejercicios
  const rutinasData = [
    { nombre: 'Pectoral + Tríceps', descripcion: 'Empuje completo', entrenadorIdx: 0, ejercicios: [0, 1, 2, 11].map((i) => ({ idx: i, series: 4, repeticiones: 10, peso: 60 })) },
    { nombre: 'Piernas + Core', descripcion: 'Tren inferior intensivo', entrenadorIdx: 0, ejercicios: [3, 4, 5, 12].map((i) => ({ idx: i, series: 4, repeticiones: 10, peso: 80 })) },
    { nombre: 'Espalda + Bíceps', descripcion: 'Tracción completa', entrenadorIdx: 1, ejercicios: [6, 7, 8, 10].map((i) => ({ idx: i, series: 4, repeticiones: 10, peso: 50 })) },
    { nombre: 'Hombros + Cardio', descripcion: 'Hombros definidos', entrenadorIdx: 1, ejercicios: [9, 10, 11].map((i) => ({ idx: i, series: 3, repeticiones: 12, peso: 30 })) },
  ]

  for (const rd of rutinasData) {
    const entrenador = entrenadores[rd.entrenadorIdx] || entrenadores[0]
    const rutina = await prisma.rutina.create({
      data: {
        id_gimnasio: gym.id_gimnasio,
        id_usuario_creador: entrenador.id_usuario,
        nombre: rd.nombre,
        descripcion: rd.descripcion || null,
      },
    })

    // Asignar entrenador a la rutina (RutinaEntrenador)
    const yaAsignado = await prisma.rutinaEntrenador.findFirst({
      where: { id_rutina: rutina.id_rutina, id_entrenador: entrenador.id_usuario },
    })
    if (!yaAsignado) {
      await prisma.rutinaEntrenador.create({
        data: {
          id_rutina: rutina.id_rutina,
          id_entrenador: entrenador.id_usuario,
        },
      })
    }

    for (const ej of rd.ejercicios) {
      const ejercicio = todosEjercicios[ej.idx]
      if (ejercicio) {
        await prisma.rutinaEjercicio.create({
          data: {
            id_rutina: rutina.id_rutina,
            id_ejercicio: ejercicio.id_ejercicio,
            series: ej.series,
            repeticiones: ej.repeticiones,
            peso_sugerido: ej.peso || null,
          },
        })
      }
    }
  }

  const rutinas = await prisma.rutina.findMany({ orderBy: { id_rutina: 'asc' } })

  // Asignar rutinas a clientes
  for (const cliente of todosClientes) {
    const rIdx = Math.floor(Math.random() * rutinas.length)
    const rutina = rutinas[rIdx]
    if (rutina) {
      const exists = await prisma.clienteRutina.findFirst({
        where: { id_cliente: cliente.id_cliente, id_rutina: rutina.id_rutina },
      })
      if (!exists) {
        // Obtener primer entrenador asignado a la rutina
        const re = await prisma.rutinaEntrenador.findFirst({
          where: { id_rutina: rutina.id_rutina, estado: true },
        })
        await prisma.clienteRutina.create({
          data: {
            id_cliente: cliente.id_cliente,
            id_rutina: rutina.id_rutina,
            id_entrenador_asignador: re?.id_entrenador ?? null,
            fecha_asignacion: new Date(Date.now() - Math.random() * 30 * 86400000),
            estado: 'activa',
          },
        })
      }
    }
  }

  // Asistencias demo (últimos 10 días)
  const asistenciasExistentes = await prisma.asistencia.count()
  if (asistenciasExistentes === 0) {
    for (const cliente of todosClientes.slice(0, 10)) {
      for (let d = 1; d <= 10; d++) {
        const dia = new Date(Date.now() - d * 86400000)
        if (dia.getDay() !== 0 && Math.random() > 0.3) {
          const ingreso = new Date(dia)
          ingreso.setHours(6 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0)
          const salida = new Date(ingreso.getTime() + (45 + Math.floor(Math.random() * 75)) * 60000)
          await prisma.asistencia.create({
            data: { id_cliente: cliente.id_cliente, fecha_hora_ingreso: ingreso, fecha_hora_salida: salida },
          })
        }
      }
    }
  }

  console.log('Seed Sprint 3 completado')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
