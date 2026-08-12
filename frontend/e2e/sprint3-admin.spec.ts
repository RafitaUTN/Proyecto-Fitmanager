import { test, expect } from '@playwright/test'

const ADMIN = { correo: 'admin@fitmanager.com', password: '123456' }
const RUTINA_ADMIN = `Rutina Test Admin ${Date.now()}`

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

    await page.getByRole('button', { name: 'Nuevo ejercicio' }).click()
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

    const editBtn = page.getByRole('button', { name: /^Editar / }).first()
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

    await page.fill('input[name="nombre"]', RUTINA_ADMIN)
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

    const card = page.getByRole('article').filter({ hasText: RUTINA_ADMIN })
    await card.getByRole('button', { name: 'Ver', exact: true }).click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Asignar Entrenador' }).click()
    const entrenadorSelect = page.getByRole('heading', { name: 'ASIGNAR RUTINA A ENTRENADOR' }).locator('..').getByRole('combobox')
    await entrenadorSelect.selectOption({ index: 1 })
    await page.getByRole('heading', { name: 'ASIGNAR RUTINA A ENTRENADOR' }).locator('..').getByRole('button', { name: 'Asignar' }).click()
    await expect(page.getByText('Rutina asignada al entrenador')).toBeVisible({ timeout: 10000 })

    await page.locator('button:has-text("Asignar Cliente")').click()
    await page.waitForTimeout(300)

    const modalSelect = page.locator('.fixed.inset-0.z-50.bg-black\\/60 select').first()
    await modalSelect.selectOption({ index: 1 })
    await page.waitForTimeout(200)

    await page.locator('button:has-text("Asignar")').last().click()
    await expect(page.getByText('Rutina asignada exitosamente')).toBeVisible({ timeout: 10000 })
  })

  test('HU-13: Admin elimina ejercicio', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/ejercicios')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Nuevo ejercicio' }).click()
    await page.fill('input[name="nombre"]', 'Ejercicio temporal eliminar')
    await page.selectOption('select[name="grupo_muscular"]', 'Pecho')
    await page.getByRole('button', { name: 'Crear ejercicio' }).click()
    await expect(page.getByText('Ejercicio creado exitosamente')).toBeVisible()

    await page.getByRole('button', { name: 'Eliminar Ejercicio temporal eliminar' }).click()
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/ejercicios/') && res.request().method() === 'DELETE'),
      page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click(),
    ])
    expect(response.ok()).toBe(true)
    await expect(page.getByText('Ejercicio eliminado')).toBeVisible()
  })

  test('HU-11: Admin registra entrada de asistencia', async ({ page, request }) => {
    const api = process.env.E2E_API_URL || 'http://localhost:3200/api'
    const loginResponse = await request.post(`${api}/auth/login`, { data: ADMIN })
    expect(loginResponse.ok()).toBe(true)
    const { token } = await loginResponse.json()
    const headers = { Authorization: `Bearer ${token}` }
    const suffix = Date.now()
    const nombreCliente = `Asistencia${suffix}`
    const clienteResponse = await request.post(`${api}/clientes`, {
      headers,
      data: {
        nombre: nombreCliente,
        apellido: 'Auditoría',
        cedula: `A${String(suffix).slice(-9)}`,
        correo: `asistencia.${suffix}@e2e.test`,
      },
    })
    expect(clienteResponse.ok()).toBe(true)
    const cliente = await clienteResponse.json()
    const planesResponse = await request.get(`${api}/membresias`, { headers })
    expect(planesResponse.ok()).toBe(true)
    const planes = await planesResponse.json()
    expect(planes.length).toBeGreaterThan(0)
    const asignacionResponse = await request.post(`${api}/clientes-membresias`, {
      headers,
      data: {
        id_cliente: cliente.id_cliente,
        id_membresia: planes[0].id_membresia,
        fecha_inicio: new Date().toISOString().split('T')[0],
      },
    })
    expect(asignacionResponse.ok()).toBe(true)

    await login(page)
    await page.goto('/dashboard/asistencias')
    await page.waitForLoadState('networkidle')

    const entradaSelect = page.locator('div:has-text("REGISTRAR ENTRADA") select').first()
    const clienteVigente = entradaSelect.locator('option').filter({ hasText: nombreCliente }).first()
    await entradaSelect.selectOption((await clienteVigente.getAttribute('value')) || '')
    await page.waitForTimeout(200)

    await page.locator('button:has-text("Entrada")').click()
    await expect(page.getByText('Entrada registrada').or(page.getByText('ya tiene una entrada'))).toBeVisible({ timeout: 10000 })
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
