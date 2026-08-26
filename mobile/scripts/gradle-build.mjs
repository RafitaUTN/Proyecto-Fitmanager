import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const task = process.argv[2] || 'assembleDebug'
const androidDir = join(process.cwd(), 'android')
const gradleExecutable = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
const gradlePath = join(androidDir, gradleExecutable)

function findWindowsJdk21() {
  if (process.platform !== 'win32') return null

  const currentJavaHome = process.env.JAVA_HOME
  if (currentJavaHome && existsSync(join(currentJavaHome, 'bin', 'java.exe')) && currentJavaHome.includes('21')) {
    return currentJavaHome
  }

  const candidateRoots = [
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Java',
  ]

  for (const root of candidateRoots) {
    if (!existsSync(root)) continue
    const match = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(root, entry.name))
      .find((candidate) => candidate.toLowerCase().includes('jdk-21') && existsSync(join(candidate, 'bin', 'java.exe')))

    if (match) return match
  }

  return null
}

const windowsJdk21 = findWindowsJdk21()
if (windowsJdk21) {
  process.env.JAVA_HOME = windowsJdk21
  process.env.Path = `${join(windowsJdk21, 'bin')};${process.env.Path || ''}`
}

if (process.platform === 'win32' && !process.env.ANDROID_HOME) {
  const defaultAndroidSdk = join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
  if (existsSync(defaultAndroidSdk)) {
    process.env.ANDROID_HOME = defaultAndroidSdk
    process.env.ANDROID_SDK_ROOT = defaultAndroidSdk
  }
}

if (!existsSync(gradlePath)) {
  console.error(`No se encontró ${gradleExecutable}. Ejecuta primero: npx cap add android`)
  process.exit(1)
}

const result = spawnSync(gradleExecutable, [task], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)
