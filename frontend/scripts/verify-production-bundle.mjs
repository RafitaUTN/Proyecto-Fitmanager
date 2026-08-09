import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(join(directory, entry.name))
    : [join(directory, entry.name)]))).flat()
}

const artifacts = (await files(fileURLToPath(new URL('../dist', import.meta.url)))).filter((file) => /\.(?:js|html|css)$/.test(file))
const bundle = (await Promise.all(artifacts.map((file) => readFile(file, 'utf8')))).join('\n')

// React Router incluye internamente `http://localhost` como base sintética para
// objetos URL sin window; bloqueamos los endpoints locales reales de la app.
if (/https?:\/\/(?:localhost|127\.0\.0\.1):(?:3000|5173)(?:\/|\b)/i.test(bundle)) {
  throw new Error('El bundle de producción contiene un endpoint local de la aplicación')
}

const expected = process.env.VITE_API_URL
if (expected && !bundle.includes(expected)) {
  throw new Error('El bundle no contiene la VITE_API_URL esperada')
}

console.log(`Bundle verificado: ${artifacts.length} artefactos, sin localhost`)
