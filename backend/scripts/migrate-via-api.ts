import { execSync } from 'child_process'
import { randomUUID } from 'crypto'

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF

if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_PROJECT_REF) {
  console.error('Faltan SUPABASE_ACCESS_TOKEN o SUPABASE_PROJECT_REF')
  process.exit(1)
}

const API = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`

async function query(sql: string): Promise<any> {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('Error en query:', data)
    throw new Error(data.message || 'Error ejecutando SQL')
  }
  return data
}

function generateSchemaSQL(): string {
  console.log('Generando schema SQL desde Prisma...')
  const output = execSync(
    'npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script',
    { encoding: 'utf-8', cwd: process.cwd() }
  )
  // Filtrar líneas que no son SQL
  return output
    .split('\n')
    .filter((l) => !l.startsWith('┌') && !l.startsWith('│') && !l.startsWith('└') && !l.startsWith('Update') && !l.startsWith('Run') && !l.startsWith('npm') && !l.trim().startsWith('Loaded'))
    .join('\n')
}

async function schemaExists(): Promise<boolean> {
  try {
    const rows: Array<{ exists: boolean }> = await query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gimnasio')"
    )
    return rows[0]?.exists === true
  } catch {
    return false
  }
}

async function applySchema(sql: string) {
  console.log('Aplicando schema...')
  await query(sql)
  console.log('✓ Schema aplicado')
}

async function runSeed() {
  const rows: Array<{ count: string }> = await query("SELECT COUNT(*)::text as count FROM gimnasio")
  if (Number(rows[0]?.count) > 0) {
    console.log('✓ Seed ya ejecutado, saltando...')
    return
  }

  const hash = '$2b$10$WnBBf3227MqfMYIj.PArNu5PRIj36hetDDRLKgpJKymyBgXlTRsyu'

  await query(`INSERT INTO gimnasio (nombre, correo, telefono, direccion) VALUES ('FitManager Gym Central', 'info@fitmanager.com', '8888-8888', 'Alajuela, Costa Rica')`)
  await query(`INSERT INTO usuario (id_gimnasio, nombre, apellido, correo, password_hash, rol) VALUES (1, 'Carlos', 'Ramírez', 'admin@fitmanager.com', '${hash}', 'Administrador')`)
  await query(`INSERT INTO usuario (id_gimnasio, nombre, apellido, correo, password_hash, rol) VALUES (1, 'Sofía', 'Vargas', 'svargas@fitmanager.com', '${hash}', 'Entrenador'), (1, 'Diego', 'Mora', 'dmora@fitmanager.com', '${hash}', 'Entrenador')`)
  await query(`INSERT INTO cliente (id_gimnasio, nombre, apellido, cedula, telefono, correo, fecha_nacimiento) VALUES (1, 'Juan', 'Pérez', '123456789', '88881111', 'juan@email.com', '1998-04-15'), (1, 'María', 'González', '234567890', '88882222', 'maria@email.com', '2000-09-22'), (1, 'Luis', 'Solís', '345678901', '88883333', 'luis@email.com', '1995-01-30')`)
  await query(`INSERT INTO membresia (id_gimnasio, nombre, descripcion, precio, duracion_dias) VALUES (1, 'Básica', 'Acceso en horario regular', 15.00, 30), (1, 'Premium', 'Acceso completo + clases grupales', 35.00, 30), (1, 'Trimestral', 'Acceso completo por 3 meses', 90.00, 90)`)
  await query(`INSERT INTO ejercicio (id_gimnasio, nombre, grupo_muscular, nivel, descripcion) VALUES (1, 'Press de banca', 'Pecho', 'intermedio', 'Ejercicio de empuje horizontal con barra o mancuernas.'), (1, 'Sentadilla', 'Piernas', 'avanzado', 'Ejercicio compuesto de tren inferior con barra en espalda.'), (1, 'Peso muerto', 'Espalda baja', 'avanzado', 'Levantamiento de barra desde el suelo hasta posición erguida.')`)

  console.log('✓ Seed completado')
}

async function main() {
  console.log('Migrando vía Supabase API...\n')

  const exists = await schemaExists()
  if (exists) {
    console.log('Schema ya existe, verificando datos...')
    await runSeed()
    console.log('\n✓ Proceso completado')
    return
  }

  const sql = generateSchemaSQL()
  await applySchema(sql)
  await runSeed()
  console.log('\n✓ Proceso completado')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
