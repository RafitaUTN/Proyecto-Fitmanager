/**
 * Siembra de datos para el RNF-07 (Escalabilidad)
 *
 * "El sistema deberá soportar hasta 10 gimnasios registrados y 1,000 clientes
 *  activos en total sin degradación significativa del rendimiento,
 *  manteniendo los tiempos de respuesta establecidos en el RNF-01."
 *
 * Medir el RNF-01 contra una base casi vacía no demuestra nada: cualquier
 * consulta responde rápido sobre 20 filas. Este script crea el volumen que el
 * RNF-07 define, para que la prueba de JMeter se ejecute contra un escenario
 * comparable al de producción.
 *
 * Genera:
 *   - 10 gimnasios
 *   - 1 administrador y 2 entrenadores por gimnasio
 *   - 3 planes de membresía por gimnasio
 *   - 1000 clientes repartidos entre los gimnasios
 *   - Membresías activas, pagos y asistencias para que los reportes y el
 *     dashboard tengan datos reales que agregar
 *
 * USO (desde backend/, con la base accesible según backend/.env):
 *
 *   npx tsx scripts/sembrar-carga.ts
 *
 * Para limpiar lo sembrado:
 *
 *   npx tsx scripts/sembrar-carga.ts --limpiar
 *
 * NOTA sobre la ubicación: este script vive en backend/scripts/ y no junto
 * al plan de JMeter en pruebas-rendimiento/. Es a propósito. Node resuelve
 * los módulos desde la carpeta del archivo hacia arriba, y no existe un
 * node_modules en la raíz del proyecto, así que desde pruebas-rendimiento/
 * no encontraría ni bcrypt ni el cliente de Prisma.
 */

import bcrypt from 'bcrypt'
import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

const GIMNASIOS = 10
const CLIENTES_TOTALES = 1000
const ENTRENADORES_POR_GIMNASIO = 2
const PREFIJO = 'carga'

const NOMBRES = ['Ana', 'Luis', 'Sofia', 'Carlos', 'Marta', 'Diego', 'Laura', 'Jose', 'Elena', 'Mario']
const APELLIDOS = ['Rojas', 'Mora', 'Vega', 'Solano', 'Cruz', 'Leiva', 'Jimenez', 'Araya', 'Castro', 'Ureña']

const aleatorio = <T>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)]
const enteroEntre = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

async function limpiar() {
  console.log('Eliminando datos de carga previos...')

  const gimnasios = await prisma.gimnasio.findMany({
    where: { correo: { startsWith: PREFIJO } },
    select: { id_gimnasio: true },
  })
  const ids = gimnasios.map((g) => g.id_gimnasio)

  if (ids.length === 0) {
    console.log('No habia datos de carga que eliminar.')
    return
  }

  const clientes = await prisma.cliente.findMany({
    where: { id_gimnasio: { in: ids } },
    select: { id_cliente: true },
  })
  const idsClientes = clientes.map((c) => c.id_cliente)

  await prisma.asistencia.deleteMany({ where: { id_cliente: { in: idsClientes } } })
  await prisma.pago.deleteMany({ where: { id_cliente: { in: idsClientes } } })
  await prisma.clienteMembresia.deleteMany({ where: { id_cliente: { in: idsClientes } } })
  await prisma.notificacion.deleteMany({ where: { id_gimnasio: { in: ids } } })
  await prisma.cliente.deleteMany({ where: { id_gimnasio: { in: ids } } })
  await prisma.membresia.deleteMany({ where: { id_gimnasio: { in: ids } } })
  await prisma.refreshToken.deleteMany({
    where: { usuario: { id_gimnasio: { in: ids } } },
  })
  await prisma.usuario.deleteMany({ where: { id_gimnasio: { in: ids } } })
  await prisma.gimnasio.deleteMany({ where: { id_gimnasio: { in: ids } } })

  console.log(`Eliminados ${ids.length} gimnasios y ${idsClientes.length} clientes.`)
}

async function sembrar() {
  const inicio = Date.now()
  console.log('Sembrando datos para el RNF-07...')
  console.log(`  ${GIMNASIOS} gimnasios, ${CLIENTES_TOTALES} clientes\n`)

  const hash = await bcrypt.hash('123456', 10)
  const clientesPorGimnasio = Math.floor(CLIENTES_TOTALES / GIMNASIOS)
  let clientesCreados = 0

  for (let g = 1; g <= GIMNASIOS; g++) {
    const gimnasio = await prisma.gimnasio.create({
      data: {
        nombre: `Gimnasio de Carga ${g}`,
        correo: `${PREFIJO}-gym${g}@prueba.local`,
        telefono: `2460${String(g).padStart(4, '0')}`,
        direccion: `Direccion de prueba ${g}`,
      },
    })

    await prisma.usuario.create({
      data: {
        id_gimnasio: gimnasio.id_gimnasio,
        nombre: 'Admin',
        apellido: `Gym${g}`,
        correo: `${PREFIJO}-admin${g}@prueba.local`,
        password_hash: hash,
        rol: 'Administrador',
      },
    })

    const entrenadores = []
    for (let e = 1; e <= ENTRENADORES_POR_GIMNASIO; e++) {
      const entrenador = await prisma.usuario.create({
        data: {
          id_gimnasio: gimnasio.id_gimnasio,
          nombre: aleatorio(NOMBRES),
          apellido: aleatorio(APELLIDOS),
          correo: `${PREFIJO}-entrenador${g}-${e}@prueba.local`,
          password_hash: hash,
          rol: 'Entrenador',
          capacidad_max: 60,
        },
      })
      entrenadores.push(entrenador)
    }

    const planes = []
    for (const [nombre, dias, precio] of [
      ['Plan Mensual', 30, 25000],
      ['Plan Trimestral', 90, 65000],
      ['Plan Anual', 365, 220000],
    ] as const) {
      planes.push(
        await prisma.membresia.create({
          data: {
            id_gimnasio: gimnasio.id_gimnasio,
            nombre,
            descripcion: `${nombre} del gimnasio ${g}`,
            precio,
            duracion_dias: dias,
          },
        }),
      )
    }

    // Clientes en lote: uno por uno serían 1000 round-trips a la base.
    const datosClientes = []
    for (let c = 1; c <= clientesPorGimnasio; c++) {
      const n = clientesCreados + c
      datosClientes.push({
        id_gimnasio: gimnasio.id_gimnasio,
        id_entrenador: aleatorio(entrenadores).id_usuario,
        nombre: aleatorio(NOMBRES),
        apellido: aleatorio(APELLIDOS),
        cedula: `9${String(n).padStart(8, '0')}`,
        correo: `${PREFIJO}-cliente${n}@prueba.local`,
        telefono: `8${String(n).padStart(7, '0')}`,
      })
    }
    await prisma.cliente.createMany({ data: datosClientes })

    const clientes = await prisma.cliente.findMany({
      where: { id_gimnasio: gimnasio.id_gimnasio },
      select: { id_cliente: true },
    })

    // Membresías activas, pagos y asistencias, para que el dashboard y los
    // reportes tengan volumen real que agregar.
    const membresias = []
    const pagos = []
    const asistencias = []

    for (const cliente of clientes) {
      const plan = aleatorio(planes)
      const inicioMembresia = new Date()
      inicioMembresia.setDate(inicioMembresia.getDate() - enteroEntre(1, 60))
      const finMembresia = new Date(inicioMembresia)
      finMembresia.setDate(finMembresia.getDate() + plan.duracion_dias)

      membresias.push({
        id_cliente: cliente.id_cliente,
        id_membresia: plan.id_membresia,
        fecha_inicio: inicioMembresia,
        fecha_fin: finMembresia,
        estado: 'activo',
      })

      // Entre 3 y 15 asistencias por cliente en los últimos 60 días.
      for (let a = 0; a < enteroEntre(3, 15); a++) {
        const ingreso = new Date()
        ingreso.setDate(ingreso.getDate() - enteroEntre(0, 60))
        ingreso.setHours(enteroEntre(5, 21), enteroEntre(0, 59))
        const salida = new Date(ingreso)
        salida.setHours(salida.getHours() + 1)
        asistencias.push({
          id_cliente: cliente.id_cliente,
          fecha_hora_ingreso: ingreso,
          fecha_hora_salida: salida,
        })
      }
    }

    await prisma.clienteMembresia.createMany({ data: membresias })
    await prisma.asistencia.createMany({ data: asistencias })

    const creadas = await prisma.clienteMembresia.findMany({
      where: { cliente: { id_gimnasio: gimnasio.id_gimnasio } },
      select: { id_cliente_membresia: true, id_cliente: true, id_membresia: true },
    })

    for (const cm of creadas) {
      const plan = planes.find((p) => p.id_membresia === cm.id_membresia)
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - enteroEntre(1, 60))
      pagos.push({
        id_cliente: cm.id_cliente,
        id_cliente_membresia: cm.id_cliente_membresia,
        monto: plan?.precio ?? 25000,
        metodo_pago: aleatorio(['efectivo', 'tarjeta', 'transferencia', 'sinpe']),
        estado: 'completado',
        fecha_pago: fecha,
      })
    }
    await prisma.pago.createMany({ data: pagos })

    clientesCreados += clientesPorGimnasio
    console.log(`  Gimnasio ${g}/${GIMNASIOS} listo — ${clientesCreados} clientes acumulados`)
  }

  const segundos = ((Date.now() - inicio) / 1000).toFixed(1)
  console.log(`\nSiembra completada en ${segundos}s`)
  console.log('\nCredenciales de cualquier gimnasio sembrado:')
  console.log(`  correo:   ${PREFIJO}-admin1@prueba.local`)
  console.log('  password: 123456')
  console.log('\nAhora ejecuta el plan de JMeter (ver README.md).')
}

async function main() {
  if (process.argv.includes('--limpiar')) {
    await limpiar()
  } else {
    await limpiar()
    await sembrar()
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
