import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let prisma: any
let pagoService: any
let asistenciaService: any
let ejercicioService: any
let rutinaService: any
let gymId: bigint
let adminId: bigint
let clienteId: bigint
let asignacionId: bigint

function requireIsolatedDatabase() {
  const raw = process.env.TEST_DATABASE_URL
  if (!raw) throw new Error('TEST_DATABASE_URL es obligatoria para integration tests')
  const url = new URL(raw)
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(url.hostname)) throw new Error('Integration tests requieren una base local o de Docker Compose')
  process.env.DATABASE_URL = raw
}

beforeAll(async () => {
  requireIsolatedDatabase()
  ;({ prisma } = await import('../../src/lib/prisma'))
  ;({ pagoService } = await import('../../src/services/pago.service'))
  ;({ asistenciaService } = await import('../../src/services/asistencia.service'))
  ;({ ejercicioService } = await import('../../src/services/ejercicio.service'))
  ;({ rutinaService } = await import('../../src/services/rutina.service'))
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const gym = await prisma.gimnasio.create({ data: { nombre: 'Business flows', correo: `business-${suffix}@test.invalid` } })
  gymId = gym.id_gimnasio
  const admin = await prisma.usuario.create({
    data: { id_gimnasio: gymId, nombre: 'Admin', apellido: 'Business', correo: `admin-business-${suffix}@test.invalid`, password_hash: 'test', rol: 'Administrador' },
  })
  adminId = admin.id_usuario
  const cliente = await prisma.cliente.create({
    data: { id_gimnasio: gymId, nombre: 'Cliente', apellido: 'Business', cedula: `business-${suffix}`, correo: `client-business-${suffix}@test.invalid` },
  })
  clienteId = cliente.id_cliente
  const plan = await prisma.membresia.create({ data: { id_gimnasio: gymId, nombre: 'Plan parcial', precio: 100, duracion_dias: 30 } })
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const inicio = new Date(hoy.getTime() - 30 * 86400000)
  const asignacion = await prisma.clienteMembresia.create({
    data: {
      id_cliente: clienteId,
      id_membresia: plan.id_membresia,
      fecha_inicio: inicio,
      fecha_fin: hoy,
      monto_adeudado: 100,
      fecha_pago_habilitada: hoy,
      fecha_vencimiento_pago: hoy,
      estado: 'activo',
    },
  })
  asignacionId = asignacion.id_cliente_membresia
})

afterAll(async () => {
  if (!prisma || !gymId) return
  await prisma.notificacion.deleteMany({ where: { OR: [{ id_gimnasio: gymId }, { id_cliente: clienteId }, { id_usuario_destino: adminId }] } })
  await prisma.clienteRutinaEjercicio.deleteMany({ where: { cliente_rutina: { id_cliente: clienteId } } })
  await prisma.clienteRutina.deleteMany({ where: { id_cliente: clienteId } })
  await prisma.rutinaEjercicio.deleteMany({ where: { rutina: { id_gimnasio: gymId } } })
  await prisma.rutina.deleteMany({ where: { id_gimnasio: gymId } })
  await prisma.ejercicio.deleteMany({ where: { id_gimnasio: gymId } })
  await prisma.asistencia.deleteMany({ where: { id_gimnasio: gymId } })
  await prisma.pago.deleteMany({ where: { id_gimnasio: gymId } })
  await prisma.clienteMembresia.deleteMany({ where: { id_cliente: clienteId } })
  await prisma.membresia.deleteMany({ where: { id_gimnasio: gymId } })
  await prisma.cliente.delete({ where: { id_cliente: clienteId } })
  await prisma.usuario.delete({ where: { id_usuario: adminId } })
  await prisma.gimnasio.delete({ where: { id_gimnasio: gymId } })
  await prisma.$disconnect()
})

describe('flujos de negocio evolucionados sobre PostgreSQL real', () => {
  it('rechaza el pago antes de la ventana generada para una membresía nueva', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const cliente = await prisma.cliente.create({
      data: {
        id_gimnasio: gymId,
        nombre: 'Cliente',
        apellido: 'Ventana',
        cedula: `window-${suffix}`,
        correo: `window-${suffix}@test.invalid`,
      },
    })
    const plan = await prisma.membresia.findFirst({ where: { id_gimnasio: gymId, nombre: 'Plan parcial' } })
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
    const vencimiento = new Date(inicio.getTime() + 30 * 86400000)
    const asignacion = await prisma.clienteMembresia.create({
      data: {
        id_cliente: cliente.id_cliente,
        id_membresia: plan.id_membresia,
        fecha_inicio: inicio,
        fecha_fin: vencimiento,
        monto_adeudado: 100,
        fecha_pago_habilitada: vencimiento,
        fecha_vencimiento_pago: vencimiento,
        estado: 'activo',
      },
    })
    await expect(pagoService.registrar(gymId, {
      id_cliente: Number(cliente.id_cliente),
      id_cliente_membresia: Number(asignacion.id_cliente_membresia),
      monto: 10,
      metodo_pago: 'sinpe',
    })).rejects.toMatchObject({ statusCode: 409, codigo: 'PAYMENT_NOT_ALLOWED_YET' })
    await prisma.clienteMembresia.delete({ where: { id_cliente_membresia: asignacion.id_cliente_membresia } })
    await prisma.cliente.delete({ where: { id_cliente: cliente.id_cliente } })
  })

  it('acumula pagos parciales, completa el saldo y bloquea el sobrepago', async () => {
    const base = { id_cliente: Number(clienteId), id_cliente_membresia: Number(asignacionId), metodo_pago: 'sinpe' as const }
    const parcial = await pagoService.registrar(gymId, { ...base, monto: 35 })
    expect(parcial.resumen).toMatchObject({ monto_pagado: 35, saldo_pendiente: 65, estado_pago: 'PARCIAL' })
    await expect(pagoService.registrar(gymId, { ...base, monto: 66 })).rejects.toMatchObject({ codigo: 'PAYMENT_EXCEEDS_BALANCE' })
    const completo = await pagoService.registrar(gymId, { ...base, monto: 65 })
    expect(completo.resumen).toMatchObject({ monto_pagado: 100, saldo_pendiente: 0, estado_pago: 'COMPLETADO' })
    await expect(pagoService.registrar(gymId, { ...base, monto: 1 })).rejects.toMatchObject({ codigo: 'PAYMENT_ALREADY_COMPLETED' })
  })

  it('lista una entrada antigua como activa y hace la salida idempotente', async () => {
    const entrada = await prisma.asistencia.create({
      data: { id_gimnasio: gymId, id_cliente: clienteId, fecha_hora_ingreso: new Date(Date.now() - 36 * 60 * 60 * 1000) },
    })
    const activas = await asistenciaService.listarActivas(gymId)
    expect(activas.some((item: any) => item.id_asistencia === entrada.id_asistencia)).toBe(true)
    await expect(asistenciaService.registrarSalida(gymId, { id_asistencia: Number(entrada.id_asistencia) })).resolves.toHaveProperty('fecha_hora_salida')
    await expect(asistenciaService.registrarSalida(gymId, { id_asistencia: Number(entrada.id_asistencia) })).rejects.toMatchObject({ codigo: 'ATTENDANCE_ALREADY_CLOSED' })
  })

  it('filtra el catálogo y conserva la experiencia de rutina al asignarla', async () => {
    const press = await ejercicioService.crear(gymId, {
      nombre: 'Press visual', grupo_muscular: 'Pecho', nivel: 'intermedio', categoria: 'Fuerza',
      imagen_url: 'https://cdn.test.invalid/press.webp', instrucciones: 'Controlar el movimiento', musculos_secundarios: ['Tríceps'],
    })
    await ejercicioService.crear(gymId, { nombre: 'Sentadilla', grupo_muscular: 'Piernas', nivel: 'principiante' })
    const catalogo = await ejercicioService.catalogo(gymId, { buscar: 'press', grupo_muscular: 'Pecho', estado: 'activo', pagina: 1, limite: 12 })
    expect(catalogo.total).toBe(1)
    expect(catalogo.data[0]).toMatchObject({ nombre: 'Press visual', imagen_url: 'https://cdn.test.invalid/press.webp' })

    const context = { gymId, actorId: adminId, actorType: 'STAFF' as const, role: 'Administrador' as const }
    const rutina = await rutinaService.crear(context, {
      nombre: 'Día de empuje', objetivo: 'Fuerza', duracion_minutos: 50, dificultad: 'intermedio',
      ejercicios: [{ id_ejercicio: Number(press.id_ejercicio), series: 4, repeticiones: 8, descanso: 120, notas: 'Tempo 3-1-1', orden: 1 }],
    })
    const asignada = await rutinaService.asignarCliente(rutina.id_rutina, context, { id_cliente: Number(clienteId) })
    const snapshot = await prisma.clienteRutinaEjercicio.findFirst({ where: { id_cliente_rutina: asignada.id_cliente_rutina } })
    expect(snapshot).toMatchObject({ nombre: 'Press visual', descanso: 120, observaciones: 'Tempo 3-1-1', orden: 1 })
  })
})
