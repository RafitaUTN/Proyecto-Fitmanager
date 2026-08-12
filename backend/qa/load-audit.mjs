const API = process.env.QA_API_URL || 'http://localhost:3001/api'
const stamp = process.env.QA_STAMP
if (!stamp || !['localhost', '127.0.0.1'].includes(new URL(API).hostname)) throw new Error('Carga QA bloqueada fuera de localhost o sin QA_STAMP')

const password = 'QaReal!2026Secure'
async function login(correo, candidate = password) {
  const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo, password: candidate }) })
  if (!response.ok) throw new Error(`Login ${correo}: ${response.status}`)
  return (await response.json()).token
}

const identities = {
  adminA: await login(`admin-a-${stamp}@test.invalid`),
  adminB: await login(`admin-b-${stamp}@test.invalid`),
  receptionA: await login(`reception2-a-${stamp}@test.invalid`),
  receptionB: await login(`reception2-b-${stamp}@test.invalid`),
  trainerA: await login(`trainer1-a-${stamp}@test.invalid`),
  trainerB: await login(`trainer1-b-${stamp}@test.invalid`),
}

const paths = {
  adminA: ['/dashboard/indicadores', '/clientes', '/membresias', '/ejercicios/catalogo', '/rutinas', '/notificaciones', '/reportes/ingresos-diarios'],
  adminB: ['/dashboard/indicadores', '/clientes', '/membresias', '/ejercicios/catalogo', '/rutinas', '/notificaciones', '/reportes/ingresos-diarios'],
  receptionA: ['/dashboard/indicadores', '/clientes', '/pagos', '/asistencias?pagina=1&limite=20', '/notificaciones'],
  receptionB: ['/dashboard/indicadores', '/clientes', '/pagos', '/asistencias?pagina=1&limite=20', '/notificaciones'],
  trainerA: ['/dashboard/indicadores', '/clientes', '/ejercicios/catalogo', '/rutinas', '/notificaciones'],
  trainerB: ['/dashboard/indicadores', '/clientes', '/ejercicios/catalogo', '/rutinas', '/notificaciones'],
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))] || 0
}

async function profile(name, actors, vus, iterations) {
  const measurements = []
  const started = performance.now()
  await Promise.all(Array.from({ length: vus }, async (_, vu) => {
    const actor = actors[vu % actors.length]
    for (let i = 0; i < iterations; i += 1) {
      const path = paths[actor][(i + vu) % paths[actor].length]
      const requestStarted = performance.now()
      try {
        const response = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${identities[actor]}` } })
        await response.arrayBuffer()
        measurements.push({ path, status: response.status, ms: performance.now() - requestStarted })
      } catch (error) {
        measurements.push({ path, status: 0, ms: performance.now() - requestStarted, error: String(error) })
      }
    }
  }))
  const elapsed = (performance.now() - started) / 1000
  const latencies = measurements.map((m) => m.ms)
  const failures = measurements.filter((m) => m.status < 200 || m.status >= 400)
  const byEndpoint = Object.entries(Object.groupBy(measurements, (m) => m.path)).map(([path, rows]) => ({
    path, requests: rows.length, errors: rows.filter((r) => r.status < 200 || r.status >= 400).length, p95: Math.round(percentile(rows.map((r) => r.ms), .95) * 100) / 100,
  })).sort((a, b) => b.p95 - a.p95)
  return {
    name, vus, iterations, requests: measurements.length, seconds: Math.round(elapsed * 100) / 100,
    throughput: Math.round(measurements.length / elapsed * 100) / 100,
    successRate: Math.round((measurements.length - failures.length) / measurements.length * 10000) / 100,
    errorRate: Math.round(failures.length / measurements.length * 10000) / 100,
    p50: Math.round(percentile(latencies, .5) * 100) / 100,
    p95: Math.round(percentile(latencies, .95) * 100) / 100,
    p99: Math.round(percentile(latencies, .99) * 100) / 100,
    status: Object.fromEntries(Object.entries(Object.groupBy(measurements, (m) => String(m.status))).map(([key, rows]) => [key, rows.length])),
    slowestEndpoints: byEndpoint.slice(0, 5),
  }
}

const profiles = []
profiles.push(await profile('Gimnasio pequeño', ['adminA', 'receptionA', 'trainerA'], 10, 20))
profiles.push(await profile('Dos gimnasios', ['adminA', 'receptionA', 'trainerA', 'adminB', 'receptionB', 'trainerB'], 12, 20))
profiles.push(await profile('Hora pico', ['adminA', 'receptionA', 'trainerA', 'adminB', 'receptionB', 'trainerB'], 15, 30))
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), api: API, profiles }))
