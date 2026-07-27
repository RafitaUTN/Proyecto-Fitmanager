import { test, expect } from '@playwright/test'

const ENTRENADOR = { correo: 'entre@fitmanager.com', password: '123456' }

test.describe.serial('Sprint 3 - Entrenador', () => {

  async function login(page: typeof test['page']) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', ENTRENADOR.correo)
    await page.fill('input[type="password"]', ENTRENADOR.password)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')
  }

  test('HU-13: Entrenador crea ejercicio', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/ejercicios')
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("Nuevo Ejercicio")')
    await page.waitForTimeout(300)

    await page.fill('input[name="nombre"]', 'Ejercicio Entrenador')
    await page.selectOption('select[name="grupo_muscular"]', 'Brazos')

    await page.click('button[type="submit"]')
    await expect(page.getByText('Ejercicio creado exitosamente')).toBeVisible({ timeout: 10000 })
  })

  test('HU-13: Entrenador crea rutina', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/rutinas')
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("Nueva Rutina")')
    await page.waitForTimeout(300)

    await page.fill('input[name="nombre"]', 'Rutina Test Entrenador')

    await page.click('button:has-text("Agregar ejercicio")')
    await page.waitForTimeout(300)

    const selectEj = page.locator('select[name$=".id_ejercicio"]').first()
    await selectEj.selectOption({ index: 1 })
    await page.waitForTimeout(200)

    await page.click('button[type="submit"]')
    await expect(page.getByText('Rutina creada exitosamente')).toBeVisible({ timeout: 10000 })
  })

  test('HU-13: Entrenador asigna rutina a cliente', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/rutinas')
    await page.waitForLoadState('networkidle')

    const asignarBtn = page.locator('button:has-text("Asignar")').first()
    await asignarBtn.click()
    await page.waitForTimeout(300)

    const modalSelect = page.locator('div.fixed select').first()
    const options = await modalSelect.locator('option').all()
    if (options.length > 1) {
      await modalSelect.selectOption({ index: 1 })
      await page.waitForTimeout(200)
    }

    await page.locator('div.fixed button:has-text("Asignar")').click()
    const response = page.getByText('Rutina asignada exitosamente').or(page.getByText('ya tiene esta rutina'))
    await expect(response).toBeVisible({ timeout: 10000 })
  })

  test('HU-13: Entrenador NO ve botón Eliminar en ejercicios', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/ejercicios')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('button:has-text("Eliminar")')).toHaveCount(0)
  })

  test('HU-12: Entrenador consulta dashboard con datos reales', async ({ page }) => {
    await login(page)
    await page.waitForTimeout(1000)

    await expect(page.getByText('Mis clientes asignados')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Rutinas activas')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Clientes presentes hoy')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main p:has-text("Notificaciones")')).toBeVisible({ timeout: 10000 })
  })
})
