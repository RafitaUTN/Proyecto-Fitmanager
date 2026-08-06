import { defineConfig, devices } from '@playwright/test'

/**
 * RNF-08 (Compatibilidad): "El sistema deberá funcionar correctamente en las
 * dos versiones más recientes de Google Chrome, Microsoft Edge y Mozilla
 * Firefox, verificándose mediante pruebas de compatibilidad en navegadores."
 *
 * Antes esta configuración solo declaraba un proyecto (chromium), así que la
 * suite e2e jamás tocó Firefox ni Edge y el RNF quedaba sin verificar.
 *
 * Ahora:
 *   - chromium y firefox usan los navegadores que Playwright trae consigo,
 *     así que corren en cualquier máquina y en CI sin instalar nada extra.
 *   - chrome y msedge usan los navegadores REALES instalados en el sistema
 *     (canales de distribución). Son los que exige literalmente el RNF-08,
 *     pero requieren que estén instalados, por eso van detrás de una bandera
 *     para no romper CI en un runner limpio.
 *
 * Uso:
 *   npm run test:e2e                    → chromium + firefox
 *   NAVEGADORES_REALES=1 npm run test:e2e → agrega Chrome y Edge de verdad
 *
 * Para instalar los canales reales una sola vez:
 *   npx playwright install chrome msedge
 */

const incluirNavegadoresReales = !!process.env.NAVEGADORES_REALES

const proyectosBase = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
]

const proyectosReales = [
  {
    name: 'google-chrome',
    use: { ...devices['Desktop Chrome'], channel: 'chrome' },
  },
  {
    name: 'microsoft-edge',
    use: { ...devices['Desktop Edge'], channel: 'msedge' },
  },
]

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'on',
  },
  projects: incluirNavegadoresReales
    ? [...proyectosBase, ...proyectosReales]
    : proyectosBase,
})
