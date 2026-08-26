import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const env = {
  ...process.env,
  VITE_MOBILE_START_PATH: process.env.VITE_MOBILE_START_PATH || '/login',
  VITE_DISABLE_PWA_SW: process.env.VITE_DISABLE_PWA_SW || 'true',
}

const frontendPublicDownloads = join('..', 'frontend', 'public', 'downloads')
const tempRoot = mkdtempSync(join(tmpdir(), 'fitmanager-mobile-build-'))
const tempDownloads = join(tempRoot, 'downloads')
let downloadsMoved = false

try {
  if (existsSync(frontendPublicDownloads)) {
    renameSync(frontendPublicDownloads, tempDownloads)
    downloadsMoved = true
  }

  const result = spawnSync('npm', ['--prefix', '../frontend', 'run', 'build'], {
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  process.exitCode = result.status ?? 1
} finally {
  if (downloadsMoved) renameSync(tempDownloads, frontendPublicDownloads)
  rmSync(tempRoot, { recursive: true, force: true })
}
