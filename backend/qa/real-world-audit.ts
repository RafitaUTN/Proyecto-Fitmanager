import bcrypt from 'bcrypt'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { tokenService } from '../src/services/token.service'

const API = process.env.QA_API_URL || 'http://localhost:3000/api'
const DATABASE_URL = process.env.DATABASE_URL || ''
const parsed = new URL(DATABASE_URL)
if (!['postgres', 'localhost', '127.0.0.1'].includes(parsed.hostname) || !parsed.pathname.toLowerCase().includes('qa_e2e')) {
  throw new Error('QA audit bloqueado fuera de una base local QA E2E')
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })
type Source = 'DOCUMENTED' | 'CODE-INVARIANT' | 'USER-REQUIREMENT' | 'SECURITY-EXPECTED' | 'INFERRED'
type Result = { id: string; area: string; title: string; pass: boolean; expected: string; actual: string; source: Source; status?: number; evidence?: unknown }
const results: Result[] = []
const stamp = Date.now().toString(36)
const strongPassword = 'QaReal!2026Secure'

function businessDate(offsetDays = 0): string {
  const costaRicaToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const [year, month, day] = costaRicaToday.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10)
}

function record(id: string, area: string, title: string, pass: boolean, expected: string, actual: string, source: Source, status?: number, evidence?: unknown) {
  results.push({ id, area, title, pass, expected, actual, source, status, evidence })
}

async function call(path: string, options: { method?: string; token?: string; body?: unknown; cookie?: string; csrf?: string } = {}) {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (options.token) headers.authorization = `Bearer ${options.token}`
  if (options.cookie) headers.cookie = options.cookie
  if (options.csrf) headers['x-csrf-token'] = options.csrf
  const started = performance.now()
  const response = await fetch(`${API}${path}`, { method: options.method || 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) })
  const durationMs = Math.round((performance.now() - started) * 100) / 100
  const text = await response.text()
  let body: any = text
  try { body = text ? JSON.parse(text) : null } catch {}
  const setCookies = typeof (response.headers as any).getSetCookie === 'function' ? (response.headers as any).getSetCookie() as string[] : []
  return { status: response.status, body, durationMs, headers: Object.fromEntries(response.headers.entries()), setCookies }
}

function cookieHeader(setCookies: string[]) { return setCookies.map((value) => value.split(';')[0]).join('; ') }
function isStatus(response: { status: number }, expected: number | number[]) { return (Array.isArray(expected) ? expected : [expected]).includes(response.status) }

async function registerGym(label: 'A' | 'B') {
  const response = await call('/gimnasios', { method: 'POST', body: {
    nombre: label === 'A' ? 'FitManager QA San Carlos' : 'FitManager QA Fortuna',
    correo: `qa-gym-${label.toLowerCase()}-${stamp}@test.invalid`, telefono: label === 'A' ? '24010001' : '24790002', direccion: 'Costa Rica',
    usuario: { nombre: 'Admin', apellido: `QA ${label}`, correo: `admin-${label.toLowerCase()}-${stamp}@test.invalid`, password: strongPassword },
  } })
  record(`REG-${label}-01`, 'Registro', `Registro completo Gym ${label}`, response.status === 201 && Boolean(response.body.token), '201 con sesión admin', `${response.status}`, 'DOCUMENTED', response.status, response.body && { id_gimnasio: response.body.id_gimnasio, id_usuario: response.body.id_usuario, rol: response.body.usuario?.rol })
  if (response.status !== 201) throw new Error(`No se pudo registrar Gym ${label}: ${JSON.stringify(response.body)}`)
  return { id: Number(response.body.id_gimnasio), adminId: Number(response.body.id_usuario), adminEmail: `admin-${label.toLowerCase()}-${stamp}@test.invalid`, token: response.body.token as string, csrf: response.body.csrfToken as string, cookies: cookieHeader(response.setCookies) }
}

async function createStaff(gym: any, label: 'A' | 'B') {
  const staff: any = {}
  for (const [key, role, ordinal] of [['reception1', 'Recepcionista', 1], ['reception2', 'Recepcionista', 2], ['trainer1', 'Entrenador', 1], ['trainer2', 'Entrenador', 2]] as const) {
    const correo = `${key}-${label.toLowerCase()}-${stamp}@test.invalid`
    const response = await call('/usuarios', { method: 'POST', token: gym.token, body: { nombre: key.startsWith('trainer') ? 'Entrenador' : 'Recepción', apellido: `QA ${label}${ordinal}`, correo, password: strongPassword, rol: role } })
    record(`USR-${label}-${ordinal}-${role[0]}`, 'Usuarios', `Crear ${role} ${ordinal} Gym ${label}`, response.status === 201, '201', `${response.status}`, 'DOCUMENTED', response.status, response.body)
    staff[key] = { id: Number(response.body?.id_usuario), correo, role }
  }
  return staff
}

async function createClients(gym: any, staff: any, label: 'A' | 'B') {
  const clients: any[] = []
  for (let i = 1; i <= 12; i += 1) {
    const correo = `cliente-${label.toLowerCase()}-${i}-${stamp}@test.invalid`
    const body: any = { nombre: `Cliente${label}`, apellido: `QA${String(i).padStart(2, '0')}`, cedula: `QA-${label}-${stamp}-${String(i).padStart(2, '0')}`, correo, telefono: `88${label === 'A' ? '01' : '02'}${String(i).padStart(4, '0')}` }
    const response = await call('/clientes', { method: 'POST', token: gym.token, body })
    const id = Number(response.body?.id_cliente)
    if (response.status === 201 && i <= 8) await call(`/clientes/${id}`, { method: 'PUT', token: gym.token, body: { id_entrenador: i % 2 ? staff.trainer1.id : staff.trainer2.id } })
    clients.push({ id, correo, cedula: body.cedula, index: i })
  }
  const listed = await call('/clientes', { token: gym.token })
  record(`CLIENT-${label}-SEED`, 'Clientes', `Crear y listar 12 clientes Gym ${label}`, listed.status === 200 && listed.body.filter((c: any) => c.correo.includes(stamp)).length === 12, '12 clientes QA visibles', `${listed.body?.filter?.((c: any) => c.correo.includes(stamp)).length ?? 'sin lista'}`, 'DOCUMENTED', listed.status)
  return clients
}

async function createPlans(gym: any, label: 'A' | 'B') {
  const plans: any[] = []
  for (const [name, price, days] of [['Básica', 10000, 30], ['Premium', 20000, 30], ['Trimestral', 50000, 90]] as const) {
    const response = await call('/membresias', { method: 'POST', token: gym.token, body: { nombre: `${name} QA ${label}`, descripcion: `Plan ${label}`, precio: price, duracion_dias: days } })
    plans.push({ id: Number(response.body?.id_membresia), name, price, days })
  }
  record(`MEM-${label}-SEED`, 'Membresías', `Crear tres planes Gym ${label}`, plans.every((plan) => Number.isFinite(plan.id)), '3 planes creados', `${plans.filter((plan) => Number.isFinite(plan.id)).length}`, 'DOCUMENTED')
  return plans
}

async function createExercisesAndRoutines(gym: any, label: 'A' | 'B') {
  const exercises: any[] = []
  const groups = ['Pecho', 'Piernas', 'Espalda', 'Core', 'Brazos']
  for (let i = 1; i <= 10; i += 1) {
    const response = await call('/ejercicios', { method: 'POST', token: gym.token, body: {
      nombre: `Ejercicio ${label}-${String(i).padStart(2, '0')}`, grupo_muscular: groups[(i - 1) % groups.length], categoria: 'Fuerza', nivel: i % 3 === 0 ? 'avanzado' : i % 2 === 0 ? 'intermedio' : 'principiante',
      imagen_url: i === 1 ? 'https://invalid.test.invalid/media.webp' : undefined,
    } })
    exercises.push({ id: Number(response.body?.id_ejercicio), index: i })
  }
  const routines: any[] = []
  for (let i = 1; i <= 5; i += 1) {
    const response = await call('/rutinas', { method: 'POST', token: gym.token, body: {
      nombre: `Rutina QA ${label}-${i}`, objetivo: 'Fuerza y movilidad', dificultad: 'intermedio', duracion_minutos: 45,
      ejercicios: exercises.slice(i - 1, i + 2).map((exercise, order) => ({ id_ejercicio: exercise.id, series: 3 + (order % 2), repeticiones: 10 + order, peso_sugerido: 10, descanso: 90, notas: `Bloque ${order + 1}`, orden: order })),
    } })
    routines.push({ id: Number(response.body?.id_rutina), index: i })
  }
  const detail = await call(`/rutinas/${routines[0].id}`, { token: gym.token })
  record(`ROUTINE-${label}-01`, 'Rutinas', `Crear rutina con ejercicios Gym ${label}`, detail.status === 200 && detail.body.rutina_ejercicios?.length === 3, '3 ejercicios persistidos', `${detail.body?.rutina_ejercicios?.length ?? 0}`, 'USER-REQUIREMENT', detail.status, detail.body)
  return { exercises, routines }
}

async function activateClient(client: any) {
  const outbox = await prisma.emailOutbox.findFirst({ where: { destinatario: client.correo, tipo: 'ACTIVACION' }, orderBy: { creado_en: 'desc' } })
  const context = outbox?.contexto as { nombre?: string; gimnasio?: string } | null
  const structured = Boolean(outbox
    && outbox.template_id === 'ACCOUNT_ACTIVATION_V1'
    && outbox.id_token
    && context?.nombre
    && context?.gimnasio)
  record('AUTH-ACT-01', 'Activación', 'Email de activación encolado y personalizado', structured, 'destinatario, plantilla y contexto estructurado correctos', outbox ? `${outbox.estado}; ${outbox.destinatario}; ${outbox.template_id}` : 'sin outbox', 'USER-REQUIREMENT', undefined, outbox && { asunto: outbox.asunto, estado: outbox.estado, ultimo_error: outbox.ultimo_error, template_id: outbox.template_id })
  const issued = await tokenService.crearActivacionRegistro(BigInt(client.id))
  const token = issued.value
  const verify = await call(`/auth/verificar?token=${token}`)
  const setup = await call('/auth/setup-password', { method: 'POST', body: { token, password: strongPassword } })
  const reuse = await call('/auth/setup-password', { method: 'POST', body: { token, password: strongPassword } })
  record('AUTH-ACT-02', 'Activación', 'Token de activación válido y de un solo uso', verify.status === 200 && setup.status === 200 && reuse.status === 400, '200, 200 y reutilización 400', `${verify.status}, ${setup.status}, ${reuse.status}`, 'SECURITY-EXPECTED', reuse.status, reuse.body)
  return token
}

async function main() {
  const gymA = await registerGym('A')
  const gymB = await registerGym('B')
  const staffA = await createStaff(gymA, 'A'); const staffB = await createStaff(gymB, 'B')
  const clientsA = await createClients(gymA, staffA, 'A'); const clientsB = await createClients(gymB, staffB, 'B')
  const plansA = await createPlans(gymA, 'A'); const plansB = await createPlans(gymB, 'B')
  const catalogA = await createExercisesAndRoutines(gymA, 'A'); const catalogB = await createExercisesAndRoutines(gymB, 'B')

  await activateClient(clientsA[0])
  const clientLogin = await call('/auth/login', { method: 'POST', body: { correo: clientsA[0].correo, password: strongPassword } })
  record('AUTH-LOGIN-CLIENT', 'Login', 'Cliente activado inicia sesión por login unificado', clientLogin.status === 200 && Boolean(clientLogin.body.cliente) && !clientLogin.body.usuario, '200 con identidad cliente', `${clientLogin.status}; cliente=${Boolean(clientLogin.body?.cliente)}`, 'DOCUMENTED', clientLogin.status)
  const clientToken = clientLogin.body?.token

  const adminLogin = await call('/auth/login', { method: 'POST', body: { correo: gymA.adminEmail, password: strongPassword } })
  const receptionLogin = await call('/auth/login', { method: 'POST', body: { correo: staffA.reception1.correo, password: strongPassword } })
  const trainerLogin = await call('/auth/login', { method: 'POST', body: { correo: staffA.trainer1.correo, password: strongPassword } })
  record('AUTH-LOGIN-ROLES', 'Login', 'Admin, recepción y entrenador inician sesión', [adminLogin, receptionLogin, trainerLogin].every((r) => r.status === 200), '3 respuestas 200', [adminLogin.status, receptionLogin.status, trainerLogin.status].join(','), 'DOCUMENTED')
  const wrong = await call('/auth/login', { method: 'POST', body: { correo: gymA.adminEmail, password: 'incorrecta' } })
  const malformed = await call('/auth/login', { method: 'POST', body: { correo: 'no-es-email', password: 'x' } })
  const empty = await call('/auth/login', { method: 'POST', body: { correo: gymA.adminEmail, password: '' } })
  record('AUTH-NEG-01', 'Login', 'Credenciales y formatos inválidos se rechazan', wrong.status === 401 && malformed.status === 400 && empty.status === 400, '401/400/400', `${wrong.status}/${malformed.status}/${empty.status}`, 'SECURITY-EXPECTED')
  const forgotKnown = await call('/auth/forgot-password', { method: 'POST', body: { correo: clientsA[0].correo } })
  const forgotUnknown = await call('/auth/forgot-password', { method: 'POST', body: { correo: `absent-${stamp}@test.invalid` } })
  record('AUTH-REC-01', 'Recuperación', 'Forgot password no enumera cuentas', forgotKnown.status === 200 && forgotUnknown.status === 200 && JSON.stringify(forgotKnown.body) === JSON.stringify(forgotUnknown.body), 'misma respuesta 200', `${forgotKnown.status}/${forgotUnknown.status}; equal=${JSON.stringify(forgotKnown.body) === JSON.stringify(forgotUnknown.body)}`, 'SECURITY-EXPECTED')

  const duplicateUser = await call('/usuarios', { method: 'POST', token: gymA.token, body: { nombre: 'Duplicado', apellido: 'QA', correo: staffA.reception1.correo, password: strongPassword, rol: 'Recepcionista' } })
  const invalidRole = await call('/usuarios', { method: 'POST', token: gymA.token, body: { nombre: 'Rol', apellido: 'Inválido', correo: `invalid-role-${stamp}@test.invalid`, password: strongPassword, rol: 'SuperAdmin' } })
  record('USR-NEG-01', 'Usuarios', 'Correo duplicado y rol inválido se rechazan', duplicateUser.status === 409 && invalidRole.status === 400, '409 y 400', `${duplicateUser.status}/${invalidRole.status}`, 'CODE-INVARIANT')

  const receptionToken = receptionLogin.body.token; const trainerToken = trainerLogin.body.token
  const rbacCases = [
    ['Recepción usuarios', receptionToken, '/usuarios', 403], ['Recepción ejercicios', receptionToken, '/ejercicios', 403], ['Recepción reportes', receptionToken, '/reportes/ingresos-mensuales', 403],
    ['Entrenador usuarios', trainerToken, '/usuarios', 403], ['Entrenador pagos', trainerToken, '/pagos', 403], ['Cliente dashboard', clientToken, '/dashboard/indicadores', 403], ['Cliente staff clientes', clientToken, '/clientes', 403],
  ] as const
  for (let i = 0; i < rbacCases.length; i += 1) {
    const [title, token, path, expected] = rbacCases[i]; const response = await call(path, { token })
    record(`RBAC-${String(i + 1).padStart(3, '0')}`, 'RBAC', title, response.status === expected, `${expected}`, `${response.status}`, 'SECURITY-EXPECTED', response.status, response.body)
  }

  const crossClient = await call(`/clientes/${clientsB[0].id}`, { token: gymA.token })
  const crossRoutine = await call(`/rutinas/${catalogB.routines[0].id}`, { token: gymA.token })
  const crossExercise = await call(`/ejercicios/${catalogB.exercises[0].id}`, { token: gymA.token })
  const crossSearch = await call(`/clientes?q=${encodeURIComponent(clientsB[0].correo)}`, { token: gymA.token })
  record('TENANT-001', 'Multi-tenant', 'IDs de cliente/rutina/ejercicio de Gym B no exponen datos a A', [crossClient, crossRoutine, crossExercise].every((r) => [403, 404].includes(r.status)), '403 o 404 en los tres', `${crossClient.status}/${crossRoutine.status}/${crossExercise.status}`, 'SECURITY-EXPECTED')
  record('TENANT-002', 'Multi-tenant', 'Búsqueda A no encuentra cliente B', crossSearch.status === 200 && Array.isArray(crossSearch.body) && crossSearch.body.length === 0, 'lista vacía', `${crossSearch.status}; ${crossSearch.body?.length}`, 'SECURITY-EXPECTED')
  const crossPlan = await call('/clientes-membresias', { method: 'POST', token: gymA.token, body: { id_cliente: clientsB[0].id, id_membresia: plansA[0].id, fecha_inicio: new Date().toISOString().slice(0, 10) } })
  const crossRoutineAssign = await call(`/rutinas/${catalogA.routines[0].id}/asignar`, { method: 'POST', token: gymA.token, body: { id_cliente: clientsB[0].id } })
  const crossAttendance = await call('/asistencias/entrada', { method: 'POST', token: receptionToken, body: { id_cliente: clientsB[0].id } })
  record('TENANT-003', 'Multi-tenant', 'Operaciones cruzadas plan/rutina/asistencia se rechazan', [crossPlan, crossRoutineAssign, crossAttendance].every((r) => [400, 403, 404].includes(r.status)), '4xx en los tres', `${crossPlan.status}/${crossRoutineAssign.status}/${crossAttendance.status}`, 'SECURITY-EXPECTED')

  const today = businessDate()
  const payableStart = businessDate(-25)
  const membership = await call('/clientes-membresias', { method: 'POST', token: gymA.token, body: { id_cliente: clientsA[0].id, id_membresia: plansA[0].id, fecha_inicio: payableStart } })
  const membershipId = Number(membership.body?.id_cliente_membresia)
  record('MEM-001', 'Membresías', 'Asignación de membresía vigente', membership.status === 201 && Number.isFinite(membershipId), '201 con id', `${membership.status}`, 'DOCUMENTED', membership.status, membership.body)
  const concurrentMembership = await Promise.all([1, 2].map(() => call('/clientes-membresias', { method: 'POST', token: gymA.token, body: { id_cliente: clientsA[1].id, id_membresia: plansA[0].id, fecha_inicio: payableStart } })))
  record('MEM-002', 'Membresías', 'Doble asignación concurrente conserva una activa', concurrentMembership.filter((r) => r.status === 201).length === 1 && concurrentMembership.filter((r) => r.status === 409).length === 1, '1x201 y 1x409', concurrentMembership.map((r) => r.status).join('/'), 'CODE-INVARIANT')

  const earlyMembership = await call('/clientes-membresias', { method: 'POST', token: gymA.token, body: { id_cliente: clientsA[9].id, id_membresia: plansA[0].id, fecha_inicio: today } })
  const earlyPayment = await call('/pagos', { method: 'POST', token: receptionToken, body: { id_cliente: clientsA[9].id, id_cliente_membresia: earlyMembership.body?.id_cliente_membresia, monto: 7000, metodo_pago: 'sinpe' } })
  record('PAY-001', 'Pagos', 'Pago el mismo día de asignación', !isStatus(earlyPayment, [200, 201]), 'rechazo hasta fecha permitida', `${earlyPayment.status}; ${JSON.stringify(earlyPayment.body?.resumen || earlyPayment.body)}`, 'USER-REQUIREMENT', earlyPayment.status, earlyPayment.body)
  const partialPayment = await call('/pagos', { method: 'POST', token: receptionToken, body: { id_cliente: clientsA[0].id, id_cliente_membresia: membershipId, monto: 7000, metodo_pago: 'sinpe' } })
  const completePayment = await call('/pagos', { method: 'POST', token: receptionToken, body: { id_cliente: clientsA[0].id, id_cliente_membresia: membershipId, monto: 3000, metodo_pago: 'efectivo' } })
  const paymentSummary = await call(`/pagos/resumen/${membershipId}`, { token: receptionToken })
  record('PAY-002', 'Pagos', 'Pagos parciales 7000 + 3000 completan ₡10000', isStatus(partialPayment, [200, 201]) && isStatus(completePayment, [200, 201]) && paymentSummary.body?.saldo_pendiente === 0, 'saldo 0, COMPLETADO', `${paymentSummary.status}; ${JSON.stringify(paymentSummary.body)}`, 'USER-REQUIREMENT', paymentSummary.status)
  for (const [idx, amount] of [0, -1000, 10001].entries()) {
    const response = await call('/pagos', { method: 'POST', token: receptionToken, body: { id_cliente: clientsA[1].id, id_cliente_membresia: concurrentMembership.find((r) => r.status === 201)?.body?.id_cliente_membresia, monto: amount, metodo_pago: 'tarjeta' } })
    record(`PAY-NEG-00${idx + 1}`, 'Pagos', `Monto inválido ${amount}`, [400, 409].includes(response.status), '400 validación o 409 conflicto de saldo', `${response.status}`, 'CODE-INVARIANT', response.status, response.body)
  }

  const attendance = await call('/asistencias/entrada', { method: 'POST', token: receptionToken, body: { id_cliente: clientsA[0].id, metodo: 'manual' } })
  const active = await call('/asistencias/activos', { token: receptionToken })
  record('ATT-001', 'Asistencias', 'Entrada aparece en listado activo para salida', attendance.status === 201 && active.status === 200 && active.body.some((a: any) => Number(a.id_asistencia) === Number(attendance.body?.id_asistencia)), 'asistencia visible en activos', `${attendance.status}; activos=${active.body?.length}`, 'USER-REQUIREMENT', active.status)
  const exit = await call('/asistencias/salida', { method: 'POST', token: receptionToken, body: { id_asistencia: attendance.body?.id_asistencia } })
  const doubleExit = await call('/asistencias/salida', { method: 'POST', token: receptionToken, body: { id_asistencia: attendance.body?.id_asistencia } })
  record('ATT-002', 'Asistencias', 'Salida y doble salida idempotente', exit.status === 200 && doubleExit.status === 409, '200 y 409', `${exit.status}/${doubleExit.status}`, 'CODE-INVARIANT', doubleExit.status, doubleExit.body)
  const concurrentEntries = await Promise.all([1, 2].map(() => call('/asistencias/entrada', { method: 'POST', token: receptionToken, body: { id_cliente: clientsA[1].id } })))
  record('ATT-003', 'Asistencias', 'Dos check-ins simultáneos crean una sola entrada', concurrentEntries.filter((r) => r.status === 201).length === 1 && concurrentEntries.filter((r) => r.status === 409).length === 1, '1x201 y 1x409', concurrentEntries.map((r) => r.status).join('/'), 'CODE-INVARIANT')

  const trainerWithoutRoutine = await call(`/rutinas/${catalogA.routines[0].id}/asignar`, { method: 'POST', token: trainerToken, body: { id_cliente: clientsA[0].id } })
  const assignTrainer = await call(`/rutinas/${catalogA.routines[0].id}/asignar-entrenador`, { method: 'POST', token: gymA.token, body: { id_entrenador: staffA.trainer1.id } })
  const routineAssign = await call(`/rutinas/${catalogA.routines[0].id}/asignar`, { method: 'POST', token: trainerToken, body: { id_cliente: clientsA[0].id } })
  const routineAssignAgain = await call(`/rutinas/${catalogA.routines[0].id}/asignar`, { method: 'POST', token: trainerToken, body: { id_cliente: clientsA[0].id } })
  const clientRoutines = await call('/cliente/me/rutinas', { token: clientToken })
  record('ROUTINE-002', 'Rutinas', 'Asignación visible con snapshot en portal', trainerWithoutRoutine.status === 404 && assignTrainer.status === 201 && routineAssign.status === 201 && routineAssignAgain.status === 409 && clientRoutines.status === 200 && clientRoutines.body.some((r: any) => r.ejercicios?.length === 3), 'sin asignar 404; asignar trainer 201; rutina 201; duplicado 409; portal con 3 ejercicios', `${trainerWithoutRoutine.status}/${assignTrainer.status}/${routineAssign.status}/${routineAssignAgain.status}; portal=${clientRoutines.status}`, 'USER-REQUIREMENT')

  const wrongCurrentPassword = await call('/cliente/me/contrasena', { method: 'PUT', token: clientToken, body: { contrasena_actual: 'incorrecta', contrasena_nueva: 'NuevaQa!2026Secure', confirmar_password: 'NuevaQa!2026Secure' } })
  const mismatched = await call('/cliente/me/contrasena', { method: 'PUT', token: clientToken, body: { contrasena_actual: strongPassword, contrasena_nueva: 'NuevaQa!2026Secure', confirmar_password: 'DistintaQa!2026' } })
  const samePassword = await call('/cliente/me/contrasena', { method: 'PUT', token: clientToken, body: { contrasena_actual: strongPassword, contrasena_nueva: strongPassword, confirmar_password: strongPassword } })
  const changed = await call('/cliente/me/contrasena', { method: 'PUT', token: clientToken, body: { contrasena_actual: strongPassword, contrasena_nueva: 'NuevaQa!2026Secure', confirmar_password: 'NuevaQa!2026Secure' } })
  record('AUTH-PASS-01', 'Password', 'Cambio de contraseña valida errores y éxito', wrongCurrentPassword.status === 400 && mismatched.status === 400 && samePassword.status === 400 && changed.status === 200, '400/400/400/200', `${wrongCurrentPassword.status}/${mismatched.status}/${samePassword.status}/${changed.status}`, 'USER-REQUIREMENT')

  const notifBefore = await prisma.notificacion.count({ where: { id_gimnasio: BigInt(gymA.id) } })
  await Promise.all([call('/notificaciones', { token: gymA.token }), call('/notificaciones', { token: gymA.token }), call('/notificaciones/contar', { token: gymA.token })])
  const notifAfter = await prisma.notificacion.count({ where: { id_gimnasio: BigInt(gymA.id) } })
  record('NOTIF-001', 'Notificaciones', 'Consultar no duplica notificaciones', notifBefore === notifAfter, 'conteo estable', `${notifBefore} -> ${notifAfter}`, 'CODE-INVARIANT')
  const trainerNotifications = await call('/notificaciones', { token: trainerToken })
  const leaks = trainerNotifications.body?.filter?.((n: any) => n.id_cliente && !clientsA.filter((c) => c.index % 2 === 1 && c.index <= 8).some((c) => Number(c.id) === Number(n.id_cliente))) || []
  record('NOTIF-002', 'Notificaciones', 'Entrenador no recibe eventos de clientes ajenos', trainerNotifications.status === 200 && leaks.length === 0, '0 notificaciones ajenas', `${leaks.length}`, 'USER-REQUIREMENT')
  const adminNotifications = await call('/notificaciones', { token: gymA.token })
  const countBefore = await call('/notificaciones/contar', { token: gymA.token })
  const unread = adminNotifications.body?.find?.((n: any) => !n.leida)
  const mark = unread ? await call(`/notificaciones/${unread.id_notificacion}/leer`, { method: 'PUT', token: gymA.token }) : null
  const countAfter = await call('/notificaciones/contar', { token: gymA.token })
  record('NOTIF-003', 'Notificaciones', 'Marcar leída persiste y reduce conteo', !unread || (mark?.status === 200 && countAfter.body.total === countBefore.body.total - 1), 'conteo -1', `${countBefore.body?.total} -> ${countAfter.body?.total}`, 'DOCUMENTED')

  const transferClient = clientsA[2]
  const transferMembership = await call('/clientes-membresias', { method: 'POST', token: gymA.token, body: { id_cliente: transferClient.id, id_membresia: plansA[1].id, fecha_inicio: payableStart } })
  await call('/pagos', { method: 'POST', token: receptionToken, body: { id_cliente: transferClient.id, id_cliente_membresia: transferMembership.body?.id_cliente_membresia, monto: 20000, metodo_pago: 'transferencia' } })
  await call(`/rutinas/${catalogA.routines[1].id}/asignar`, { method: 'POST', token: gymA.token, body: { id_cliente: transferClient.id } })
  const transferRequest = await call('/transferencias', { method: 'POST', token: gymB.token, body: { id_cliente: transferClient.id, motivo: 'Cambio de residencia QA' } })
  const transferDuplicate = await call('/transferencias', { method: 'POST', token: gymB.token, body: { id_cliente: transferClient.id, motivo: 'Duplicada' } })
  const approve = await call(`/transferencias/${transferRequest.body?.id}/aprobar`, { method: 'PUT', token: gymA.token, body: { observaciones: 'Historial verificado' } })
  const approveAgain = await call(`/transferencias/${transferRequest.body?.id}/aprobar`, { method: 'PUT', token: gymA.token, body: { observaciones: 'Otra vez' } })
  const formerAccess = await call(`/clientes/${transferClient.id}`, { token: gymA.token }); const newAccess = await call(`/clientes/${transferClient.id}`, { token: gymB.token })
  const dbTransfer = await prisma.cliente.findUnique({ where: { id_cliente: BigInt(transferClient.id) }, include: { cliente_membresias: true, cliente_rutinas: true, pagos: true, asistencias: true } })
  const historicalGymIds = new Set(dbTransfer?.pagos.map((p) => Number(p.id_gimnasio)) || [])
  record('TRANSFER-001', 'Transferencias', 'Transferencia completa, única y con control de estado', transferRequest.status === 201 && transferDuplicate.status === 409 && approve.status === 200 && approveAgain.status === 409, '201/409/200/409', `${transferRequest.status}/${transferDuplicate.status}/${approve.status}/${approveAgain.status}`, 'CODE-INVARIANT')
  record('TRANSFER-002', 'Transferencias', 'Acceso y relaciones posteriores coherentes', formerAccess.status === 404 && newAccess.status === 200 && Number(dbTransfer?.id_gimnasio) === gymB.id && dbTransfer?.id_entrenador === null && dbTransfer?.cliente_membresias.every((m) => m.estado !== 'activo') && dbTransfer?.cliente_rutinas.every((r) => r.estado === 'archivada'), 'A=404, B=200, trainer null, membresía cancelada, rutina archivada', `${formerAccess.status}/${newAccess.status}`, 'USER-REQUIREMENT', undefined, dbTransfer && { gym: Number(dbTransfer.id_gimnasio), trainer: dbTransfer.id_entrenador, memberships: dbTransfer.cliente_membresias.map((m) => m.estado), routines: dbTransfer.cliente_rutinas.map((r) => r.estado) })
  record('TRANSFER-003', 'Transferencias', 'Pagos históricos conservan tenant origen', historicalGymIds.size === 1 && historicalGymIds.has(gymA.id), `solo Gym A (${gymA.id})`, [...historicalGymIds].join(','), 'USER-REQUIREMENT')

  const debtClient = clientsA[3]
  const debtMembership = await call('/clientes-membresias', { method: 'POST', token: gymA.token, body: { id_cliente: debtClient.id, id_membresia: plansA[0].id, fecha_inicio: payableStart } })
  await call('/pagos', { method: 'POST', token: receptionToken, body: { id_cliente: debtClient.id, id_cliente_membresia: debtMembership.body?.id_cliente_membresia, monto: 1000, metodo_pago: 'sinpe' } })
  const debtTransfer = await call('/transferencias', { method: 'POST', token: gymB.token, body: { id_cliente: debtClient.id, motivo: 'Cliente con saldo parcial' } })
  const debtApprove = await call(`/transferencias/${debtTransfer.body?.id}/aprobar`, { method: 'PUT', token: gymA.token, body: { observaciones: 'Debe bloquear por deuda' } })
  record('TRANSFER-004', 'Transferencias', 'Transferencia con saldo parcial se bloquea', debtApprove.status === 400, '400 PAGOS_PENDIENTES', `${debtApprove.status}; ${JSON.stringify(debtApprove.body)}`, 'USER-REQUIREMENT', debtApprove.status, debtApprove.body)

  const trainerOtherClient = await call(`/clientes/${clientsA[1].id}`, { token: trainerToken })
  record('RBAC-008', 'RBAC', 'Entrenador no accede cliente asignado a otro entrenador', trainerOtherClient.status === 404, '404', `${trainerOtherClient.status}`, 'SECURITY-EXPECTED', trainerOtherClient.status)
  const selfDeactivate = await call(`/usuarios/${gymA.adminId}`, { method: 'PUT', token: gymA.token, body: { estado: false } })
  const selfDelete = await call(`/usuarios/${gymA.adminId}`, { method: 'DELETE', token: gymA.token })
  record('USR-NEG-02', 'Usuarios', 'Último administrador no puede desactivarse ni eliminarse', selfDeactivate.status === 400 && selfDelete.status === 400, '400 y 400', `${selfDeactivate.status}/${selfDelete.status}`, 'CODE-INVARIANT')

  const noMembershipEntry = await call('/asistencias/entrada', { method: 'POST', token: receptionToken, body: { id_cliente: clientsA[4].id } })
  record('ATT-004', 'Asistencias', 'Cliente sin membresía no entra', noMembershipEntry.status === 400, '400', `${noMembershipEntry.status}`, 'DOCUMENTED', noMembershipEntry.status)
  const future = businessDate(7)
  await call('/clientes-membresias', { method: 'POST', token: gymA.token, body: { id_cliente: clientsA[4].id, id_membresia: plansA[0].id, fecha_inicio: future } })
  const futureEntry = await call('/asistencias/entrada', { method: 'POST', token: receptionToken, body: { id_cliente: clientsA[4].id } })
  record('ATT-005', 'Asistencias', 'Membresía futura no habilita entrada', futureEntry.status === 400, '400', `${futureEntry.status}`, 'CODE-INVARIANT')
  const cancelMembership = await call('/clientes-membresias', { method: 'POST', token: gymA.token, body: { id_cliente: clientsA[5].id, id_membresia: plansA[0].id, fecha_inicio: today } })
  await call(`/clientes-membresias/${cancelMembership.body?.id_cliente_membresia}/cancelar`, { method: 'POST', token: gymA.token })
  const cancelledEntry = await call('/asistencias/entrada', { method: 'POST', token: receptionToken, body: { id_cliente: clientsA[5].id } })
  record('ATT-006', 'Asistencias', 'Membresía cancelada no habilita entrada', cancelledEntry.status === 400, '400', `${cancelledEntry.status}`, 'CODE-INVARIANT')

  const methodMembership = await call('/clientes-membresias', { method: 'POST', token: gymA.token, body: { id_cliente: clientsA[6].id, id_membresia: plansA[0].id, fecha_inicio: payableStart } })
  const methodResponses = []
  for (const method of ['efectivo', 'sinpe', 'tarjeta', 'transferencia']) {
    methodResponses.push(await call('/pagos', { method: 'POST', token: receptionToken, body: { id_cliente: clientsA[6].id, id_cliente_membresia: methodMembership.body?.id_cliente_membresia, monto: 2500, metodo_pago: method } }))
  }
  const persistedMethods = await prisma.pago.findMany({ where: { id_cliente_membresia: BigInt(methodMembership.body?.id_cliente_membresia) }, select: { metodo_pago: true } })
  record('PAY-003', 'Pagos', 'Cuatro métodos de pago persisten', methodResponses.every((r) => r.status === 201) && new Set(persistedMethods.map((p) => p.metodo_pago)).size === 4, '4x201 y cuatro métodos DB', `${methodResponses.map((r) => r.status).join('/')}; DB=${persistedMethods.map((p) => p.metodo_pago).join(',')}`, 'USER-REQUIREMENT')
  const raceMembership = await call('/clientes-membresias', { method: 'POST', token: gymA.token, body: { id_cliente: clientsA[7].id, id_membresia: plansA[0].id, fecha_inicio: payableStart } })
  const paymentRace = await Promise.all([1, 2].map(() => call('/pagos', { method: 'POST', token: receptionToken, body: { id_cliente: clientsA[7].id, id_cliente_membresia: raceMembership.body?.id_cliente_membresia, monto: 6000, metodo_pago: 'sinpe' } })))
  const raceSummary = await call(`/pagos/resumen/${raceMembership.body?.id_cliente_membresia}`, { token: receptionToken })
  record('PAY-004', 'Pagos', 'Dos pagos simultáneos no sobrepagan', paymentRace.filter((r) => r.status === 201).length === 1 && paymentRace.filter((r) => r.status === 409).length === 1 && raceSummary.body?.monto_pagado === 6000, '1x201, 1x409, pagado 6000', `${paymentRace.map((r) => r.status).join('/')}; pagado=${raceSummary.body?.monto_pagado}`, 'CODE-INVARIANT')

  const hugeClient = await call('/clientes', { method: 'POST', token: gymA.token, body: { nombre: 'X'.repeat(10000), apellido: 'QA', cedula: `HUGE-${stamp}`, correo: `huge-${stamp}@test.invalid` } })
  const nullClient = await call('/clientes', { method: 'POST', token: gymA.token, body: { nombre: null, apellido: '', cedula: '', correo: null } })
  const unknownFieldClient = await call('/clientes', { method: 'POST', token: gymA.token, body: { nombre: 'Campo', apellido: 'Extra', cedula: `EXTRA-${stamp}`, correo: `extra-${stamp}@test.invalid`, es_superadmin: true } })
  record('API-VAL-001', 'Validaciones', 'Null, vacío y string enorme se rechazan', hugeClient.status === 400 && nullClient.status === 400, '400 y 400', `${hugeClient.status}/${nullClient.status}`, 'SECURITY-EXPECTED')
  record('API-VAL-002', 'Validaciones', 'Campo inesperado no altera privilegios', unknownFieldClient.status === 201, '201 con campo descartado', `${unknownFieldClient.status}`, 'SECURITY-EXPECTED', unknownFieldClient.status)

  const notificationB = await prisma.notificacion.findFirst({ where: { id_gimnasio: BigInt(gymB.id) }, orderBy: { fecha_envio: 'desc' } })
  const crossNotification = notificationB ? await call(`/notificaciones/${notificationB.id_notificacion}/leer`, { method: 'PUT', token: gymA.token }) : null
  record('TENANT-004', 'Multi-tenant', 'Admin A no marca notificación B', !notificationB || crossNotification?.status === 404, '404', notificationB ? `${crossNotification?.status}` : 'sin notificación B', 'SECURITY-EXPECTED')

  const openTransferClient = clientsA[8]
  const openMembership = await call('/clientes-membresias', { method: 'POST', token: gymA.token, body: { id_cliente: openTransferClient.id, id_membresia: plansA[0].id, fecha_inicio: payableStart } })
  await call('/pagos', { method: 'POST', token: receptionToken, body: { id_cliente: openTransferClient.id, id_cliente_membresia: openMembership.body?.id_cliente_membresia, monto: 10000, metodo_pago: 'efectivo' } })
  const openAttendance = await call('/asistencias/entrada', { method: 'POST', token: receptionToken, body: { id_cliente: openTransferClient.id } })
  const openTransfer = await call('/transferencias', { method: 'POST', token: gymB.token, body: { id_cliente: openTransferClient.id, motivo: 'Traslado mientras está dentro' } })
  const openApprove = await call(`/transferencias/${openTransfer.body?.id}/aprobar`, { method: 'PUT', token: gymA.token, body: { observaciones: 'Debe resolver asistencia abierta' } })
  const openStillActive = await prisma.asistencia.findUnique({ where: { id_asistencia: BigInt(openAttendance.body?.id_asistencia) } })
  record('TRANSFER-005', 'Transferencias', 'Transferencia con asistencia abierta se bloquea o cierra atómicamente', [400, 409].includes(openApprove.status) || Boolean(openStillActive?.fecha_hora_salida), '400/409 o asistencia cerrada', `${openApprove.status}; salida=${openStillActive?.fecha_hora_salida ?? 'null'}`, 'INFERRED', openApprove.status)

  const reports = await Promise.all(['/reportes/ingresos-mensuales', '/reportes/nuevos-clientes', '/reportes/asistencias', '/reportes/distribucion-membresias', '/reportes/metodos-pago', '/reportes/ingresos-diarios', '/reportes/asistencias-por-hora', '/reportes/clientes-activos-inactivos'].map((path) => call(path, { token: gymA.token })))
  record('REPORT-001', 'Reportes', 'Ocho reportes administrativos responden', reports.every((r) => r.status === 200), '8x200', reports.map((r) => r.status).join('/'), 'DOCUMENTED', undefined, reports.map((r) => r.durationMs))
  const invalidDateReport = await call('/reportes/ingresos-diarios?fecha_inicio=invalid', { token: gymA.token })
  record('REPORT-002', 'Reportes', 'Fecha inválida se rechaza', invalidDateReport.status === 400, '400', `${invalidDateReport.status}`, 'CODE-INVARIANT')

  const noCsrfRefresh = await call('/auth/refresh', { method: 'POST', cookie: gymA.cookies })
  const goodRefresh = await call('/auth/refresh', { method: 'POST', cookie: gymA.cookies, csrf: gymA.csrf })
  const oldRefresh = await call('/auth/refresh', { method: 'POST', cookie: gymA.cookies, csrf: gymA.csrf })
  record('AUTH-SESSION-01', 'Sesiones', 'CSRF obligatorio y refresh rota', noCsrfRefresh.status === 403 && goodRefresh.status === 200 && oldRefresh.status === 401, '403/200/401', `${noCsrfRefresh.status}/${goodRefresh.status}/${oldRefresh.status}`, 'SECURITY-EXPECTED')
  const logoutSession = await call('/auth/login', { method: 'POST', body: { correo: gymB.adminEmail, password: strongPassword } })
  const logoutCookies = cookieHeader(logoutSession.setCookies)
  const logout = await call('/auth/logout', { method: 'POST', cookie: logoutCookies, csrf: logoutSession.body?.csrfToken })
  const accessAfterLogout = await call('/dashboard/indicadores', { token: logoutSession.body?.token })
  const refreshAfterLogout = await call('/auth/refresh', { method: 'POST', cookie: logoutCookies, csrf: logoutSession.body?.csrfToken })
  record('AUTH-SESSION-02', 'Sesiones', 'Logout revoca refresh; access corto conserva semántica JWT', logout.status === 200 && refreshAfterLogout.status === 401 && accessAfterLogout.status === 200, 'logout 200, refresh 401, access válido hasta expirar', `${logout.status}/${refreshAfterLogout.status}/${accessAfterLogout.status}`, 'CODE-INVARIANT')
  const disableReception = await call(`/usuarios/${staffA.reception1.id}`, { method: 'PUT', token: gymA.token, body: { estado: false } })
  const disabledSession = await call('/dashboard/indicadores', { token: receptionToken })
  record('AUTH-SESSION-03', 'Sesiones', 'Desactivar usuario revoca access activo inmediatamente', disableReception.status === 200 && disabledSession.status === 401, '200 y 401', `${disableReception.status}/${disabledSession.status}`, 'SECURITY-EXPECTED')

  const activeRows = await prisma.asistencia.groupBy({ by: ['id_cliente'], where: { fecha_hora_salida: null }, _count: true })
  const duplicateActive = activeRows.filter((row) => row._count > 1)
  const activeMembershipRows = await prisma.clienteMembresia.groupBy({ by: ['id_cliente'], where: { estado: 'activo' }, _count: true })
  const duplicateMembership = activeMembershipRows.filter((row) => row._count > 1)
  const orphanNotifications = await prisma.notificacion.count({ where: { id_gimnasio: null, id_cliente: null, id_usuario_destino: null } })
  record('DB-001', 'Base de datos', 'Invariantes globales post-flujos', duplicateActive.length === 0 && duplicateMembership.length === 0 && orphanNotifications === 0, 'sin dobles abiertas/activas ni notificaciones huérfanas', `attendance=${duplicateActive.length}; memberships=${duplicateMembership.length}; orphanNotif=${orphanNotifications}`, 'CODE-INVARIANT')

  const summary = { generatedAt: new Date().toISOString(), api: API, database: parsed.pathname.slice(1), stamp, total: results.length, passed: results.filter((r) => r.pass).length, failed: results.filter((r) => !r.pass).length, results }
  console.log(`QA_AUDIT_RESULT=${JSON.stringify(summary, (_key, value) => typeof value === 'bigint' ? value.toString() : value)}`)
  await prisma.$disconnect()
}

main().catch(async (error) => { console.error('QA_AUDIT_FATAL', error); await prisma.$disconnect(); process.exit(1) })
