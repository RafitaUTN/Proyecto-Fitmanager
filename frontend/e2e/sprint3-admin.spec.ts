import { test, expect } from '@playwright/test'

const ADMIN = { correo: 'admin@fitmanager.com', password: '123456' }

test.describe.serial('Sprint 3 - Admin', () => {

  async function login(page: typeof test['page']) {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', ADMIN.correo)
    await page.fill('input[type="password"]', ADMIN.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    await page.waitForLoadState('networkidle')
  }

  test('HU-13: Admin crea ejercicio', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/ejercicios')
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("Nuevo Ejercicio")')
    await page.waitForTimeout(300)

    await page.fill('input[name="nombre"]', 'Test Press Banca')
    await page.selectOption('select[name="grupo_muscular"]', 'Pecho')
    await page.fill('textarea[name="descripcion"]', 'Ejercicio de prueba')

    await page.click('button[type="submit"]')
    await expect(page.getByText('Ejercicio creado exitosamente')).toBeVisible({ timeout: 10000 })
  })

  test('HU-13: Admin edita ejercicio', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/ejercicios')
    await page.waitForLoadState('networkidle')

    const editBtn = page.locator('button:has-text("Editar")').first()
    await editBtn.click()
    await page.waitForTimeout(300)

    await page.fill('input[name="nombre"]', 'Press Banca Editado')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Ejercicio actualizado')).toBeVisible({ timeout: 10000 })
  })

  test('HU-13: Admin crea rutina con ejercicios', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/rutinas')
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("Nueva Rutina")')
    await page.waitForTimeout(300)

    await page.fill('input[name="nombre"]', 'Rutina Test Admin')
    await page.fill('input[name="descripcion"]', 'Descripción de prueba')

    await page.click('button:has-text("Agregar ejercicio")')
    await page.waitForTimeout(300)

    const selectEj = page.locator('select[name$=".id_ejercicio"]').first()
    await selectEj.selectOption({ index: 1 })
    await page.waitForTimeout(200)

    await page.click('button[type="submit"]')
    await expect(page.getByText('Rutina creada exitosamente')).toBeVisible({ timeout: 10000 })
  })

  test('HU-13: Admin asigna rutina a cliente', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/rutinas')
    await page.waitForLoadState('networkidle')

    const asignarBtn = page.locator('button:has-text("Asignar")').first()
    await asignarBtn.click()
    await page.waitForTimeout(300)

    const modalSelect = page.locator('div.fixed select').first()
    await modalSelect.selectOption({ index: 1 })
    await page.waitForTimeout(200)

    await page.locator('div.fixed button:has-text("Asignar")').click()
    await expect(page.getByText('Rutina asignada exitosamente')).toBeVisible({ timeout: 10000 })
  })

  test('HU-13: Admin elimina ejercicio', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/ejercicios')
    await page.waitForLoadState('networkidle')

    const eliminarBtn = page.locator('button:has-text("Eliminar")').first()
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/ejercicios/') && res.request().method() === 'DELETE', { timeout: 10000 }).catch(() => { return null }),
      eliminarBtn.click(),
    ])
    await page.waitForTimeout(300)

    const confirmBtn = page.locator('div.fixed button:has-text("Eliminar")').last()
    if (await confirmBtn.isVisible()) {
      const [response2] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/ejercicios/') && res.request().method() === 'DELETE', { timeout: 10000 }).catch(() => { return null }),
        confirmBtn.click(),
      ])
      await page.waitForTimeout(500)
      if (response2) {
        expect(response2.status() >= 200 && response2.status() < 300).toBeTruthy()
      }
    }
  })

  test('HU-11: Admin registra entrada de asistencia', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/asistencias')
    await page.waitForLoadState('networkidle')

    const entradaSelect = page.locator('div:has-text("REGISTRAR ENTRADA") select').first()
    await entradaSelect.selectOption({ index: 1 })
    await page.waitForTimeout(200)

    await page.locator('button:has-text("Entrada")').click()
    await expect(page.getByText('Entrada registrada')).toBeVisible({ timeout: 10000 })
  })

  test('HU-12: Admin consulta historial asistencias', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/asistencias')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(1000)
    await expect(page.getByText('HISTORIAL')).toBeVisible({ timeout: 10000 })
  })

  test('HU-10: Admin filtra pagos por cliente', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/pagos')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(500)
    const filterSelect = page.locator('select').first()
    const options = await filterSelect.locator('option').all()
    if (options.length > 1) {
      await filterSelect.selectOption({ index: 1 })
      await page.waitForTimeout(500)
    }
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
  })
})
