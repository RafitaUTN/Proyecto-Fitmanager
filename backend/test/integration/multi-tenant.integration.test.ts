import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let prisma: any
let clienteService: any
let clienteMembresiaService: any
let rutinaService: any
let asistenciaService: any
let notificacionService: any
let gymA: bigint
let gymB: bigint
let adminA: bigint
let adminB: bigint
let trainerA: bigint
let trainerB: bigint
let clientB: bigint
let planA: bigint
let exerciseA: bigint
let exerciseB: bigint
let routineA: bigint
let routineB: bigint
let notificationB: bigint

function guard() {
  const raw = process.env.TEST_DATABASE_URL
  if (!raw) throw new Error('TEST_DATABASE_URL es obligatoria')
  const url = new URL(raw)
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(url.hostname)) throw new Error('Integration requiere una base local o de Docker Compose')
  process.env.DATABASE_URL = raw
}

beforeAll(async () => {
  guard()
  ;({ prisma } = await import('../../src/lib/prisma'))
  ;({ clienteService } = await import('../../src/services/cliente.service'))
  ;({ clienteMembresiaService } = await import('../../src/services/cliente-membresia.service'))
  ;({ rutinaService } = await import('../../src/services/rutina.service'))
  ;({ asistenciaService } = await import('../../src/services/asistencia.service'))
  ;({ notificacionService } = await import('../../src/services/notificacion.service'))
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const gyms = await Promise.all([
    prisma.gimnasio.create({ data: { nombre: 'Tenant A', correo: `tenant-a-${suffix}@test.invalid` } }),
    prisma.gimnasio.create({ data: { nombre: 'Tenant B', correo: `tenant-b-${suffix}@test.invalid` } }),
  ])
  ;[gymA, gymB] = gyms.map((gym: any) => gym.id_gimnasio)
  const users = await Promise.all([
    prisma.usuario.create({ data: { id_gimnasio: gymA, nombre: 'Admin', apellido: 'A', correo: `admin-a-${suffix}@test.invalid`, password_hash: 'x', rol: 'Administrador' } }),
    prisma.usuario.create({ data: { id_gimnasio: gymB, nombre: 'Admin', apellido: 'B', correo: `admin-b-${suffix}@test.invalid`, password_hash: 'x', rol: 'Administrador' } }),
    prisma.usuario.create({ data: { id_gimnasio: gymA, nombre: 'Trainer', apellido: 'A', correo: `trainer-a-${suffix}@test.invalid`, password_hash: 'x', rol: 'Entrenador' } }),
    prisma.usuario.create({ data: { id_gimnasio: gymB, nombre: 'Trainer', apellido: 'B', correo: `trainer-b-${suffix}@test.invalid`, password_hash: 'x', rol: 'Entrenador' } }),
  ])
  ;[adminA, adminB, trainerA, trainerB] = users.map((user: any) => user.id_usuario)
  const client = await prisma.cliente.create({ data: { id_gimnasio: gymB, id_entrenador: trainerB, nombre: 'Cliente', apellido: 'B', cedula: `tenant-${suffix}`, correo: `client-b-${suffix}@test.invalid` } })
  clientB = client.id_cliente
  planA = (await prisma.membresia.create({ data: { id_gimnasio: gymA, nombre: 'Plan A', precio: 10, duracion_dias: 30 } })).id_membresia
  const exercises = await Promise.all([
    prisma.ejercicio.create({ data: { id_gimnasio: gymA, nombre: 'Ejercicio A', grupo_muscular: 'Core' } }),
    prisma.ejercicio.create({ data: { id_gimnasio: gymB, nombre: 'Ejercicio B', grupo_muscular: 'Core' } }),
  ])
  ;[exerciseA, exerciseB] = exercises.map((exercise: any) => exercise.id_ejercicio)
  const routines = await Promise.all([
    prisma.rutina.create({ data: { id_gimnasio: gymA, id_usuario_creador: trainerA, nombre: 'Rutina A' } }),
    prisma.rutina.create({ data: { id_gimnasio: gymB, id_usuario_creador: trainerB, nombre: 'Rutina B' } }),
  ])
  ;[routineA, routineB] = routines.map((routine: any) => routine.id_rutina)
  await prisma.rutinaEntrenador.create({ data: { id_rutina: routineA, id_entrenador: trainerA } })
  notificationB = (await prisma.notificacion.create({ data: { id_gimnasio: gymB, titulo: 'Solo B', mensaje: 'privada', tipo: 'SISTEMA' } })).id_notificacion
})

afterAll(async () => {
  if (!prisma || !gymA) return
  await prisma.notificacion.deleteMany({ where: { id_gimnasio: { in: [gymA, gymB] } } })
  await prisma.rutinaEntrenador.deleteMany({ where: { rutina: { id_gimnasio: { in: [gymA, gymB] } } } })
  await prisma.rutina.deleteMany({ where: { id_gimnasio: { in: [gymA, gymB] } } })
  await prisma.ejercicio.deleteMany({ where: { id_gimnasio: { in: [gymA, gymB] } } })
  await prisma.membresia.deleteMany({ where: { id_gimnasio: gymA } })
  await prisma.cliente.delete({ where: { id_cliente: clientB } })
  await prisma.usuario.deleteMany({ where: { id_gimnasio: { in: [gymA, gymB] } } })
  await prisma.gimnasio.deleteMany({ where: { id_gimnasio: { in: [gymA, gymB] } } })
  await prisma.$disconnect()
})

const adminContextA = () => ({ actorId: adminA, actorType: 'STAFF', role: 'Administrador', gymId: gymA })
const trainerContextA = () => ({ actorId: trainerA, actorType: 'STAFF', role: 'Entrenador', gymId: gymA })

describe('matriz negativa multi-tenant con PostgreSQL real', () => {
  it('oculta cliente de B al actor de A', async () => {
    await expect(clienteService.buscar(clientB, gymA)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('impide asignar plan A a cliente B', async () => {
    await expect(clienteMembresiaService.asignar(gymA, { id_cliente: Number(clientB), id_membresia: Number(planA), fecha_inicio: '2026-08-09' })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('oculta rutina B y rechaza ejercicio B al crear en A', async () => {
    await expect(rutinaService.obtener(routineB, adminContextA())).rejects.toMatchObject({ statusCode: 404 })
    await expect(rutinaService.crear(adminContextA(), { nombre: 'Cruce', ejercicios: [{ id_ejercicio: Number(exerciseB), series: 3, repeticiones: 10 }] })).rejects.toMatchObject({ statusCode: 400 })
  })

  it('entrenador A no asigna rutina A a cliente B', async () => {
    await expect(rutinaService.asignarCliente(routineA, trainerContextA(), { id_cliente: Number(clientB) })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('recepción A no registra asistencia de cliente B', async () => {
    await expect(asistenciaService.registrarEntrada(gymA, { id_cliente: Number(clientB) })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('admin A no marca notificación de B', async () => {
    await expect(notificacionService.marcarLeida(notificationB, gymA, 'Administrador', Number(adminA))).rejects.toMatchObject({ statusCode: 404 })
  })
})
