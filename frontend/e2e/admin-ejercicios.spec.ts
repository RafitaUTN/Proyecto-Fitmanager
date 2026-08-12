import { test, expect } from '@playwright/test'

test.describe('Admin - Ejercicios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="correo"]', 'admin@fitmanager.com')
    await page.fill('input[name="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    await page.goto('/dashboard/ejercicios')
    await page.getByRole('heading', { name: 'CATÁLOGO DE EJERCICIOS' }).waitFor()
  })

  test('Admin crea ejercicio', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo ejercicio' }).click()
    await page.fill('input[name="nombre"]', 'Ejercicio Test E2E')
    await page.selectOption('select[name="grupo_muscular"]', 'Pecho')
    await page.selectOption('select[name="categoria"]', 'Pecho')
    await page.selectOption('select[name="nivel"]', 'principiante')
    await page.click('button:has-text("Crear Ejercicio")')
    await expect(page.locator('text=Ejercicio creado exitosamente')).toBeVisible()
  })

  test('Admin edita ejercicio', async ({ page }) => {
    await page.getByRole('button', { name: 'Editar Ejercicio Test E2E', exact: true }).first().click()
    await page.fill('input[name="nombre"]', 'Ejercicio Test E2E Editado')
    await page.click('button:has-text("Guardar Cambios")')
    await expect(page.locator('text=Ejercicio actualizado')).toBeVisible()
  })

  test('Admin desactiva ejercicio', async ({ page }) => {
    await page.getByRole('button', { name: 'Desactivar Ejercicio Test E2E Editado', exact: true }).first().click()
    await expect(page.locator('article').filter({ hasText: 'Ejercicio Test E2E Editado' }).first().getByText('Inactivo')).toBeVisible()
  })

  test('Admin activa ejercicio', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Estado' }).selectOption('inactivo')
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/ejercicios/') && res.request().method() === 'PUT'),
      page.getByRole('button', { name: 'Activar Ejercicio Test E2E Editado', exact: true }).first().click(),
    ])
    await page.getByRole('combobox', { name: 'Estado' }).selectOption('todos')
    await expect(page.getByRole('button', { name: 'Desactivar Ejercicio Test E2E Editado', exact: true }).first()).toBeVisible()
  })

  test('Admin elimina ejercicio', async ({ page }) => {
    await page.getByRole('button', { name: 'Eliminar Ejercicio Test E2E Editado', exact: true }).first().click()
    await page.getByRole('heading', { name: 'Eliminar ejercicio' }).waitFor()
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/ejercicios/') && res.request().method() === 'DELETE'),
      page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click({ force: true }),
    ])
    expect(response.ok()).toBe(true)
    await expect(page.locator('text=Ejercicio eliminado')).toBeVisible({ timeout: 10000 })
  })
})
