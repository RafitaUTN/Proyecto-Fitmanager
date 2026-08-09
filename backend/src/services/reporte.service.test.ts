import { describe, expect, it } from 'vitest'
import { csvToXlsx } from './reporte.service'

describe('exportación Excel', () => {
  it('genera un workbook válido con la versión segura de uuid', async () => {
    const workbook = await csvToXlsx('Plan,Total\nPremium,10', 'Membresías', 'Gym', '2026', '2026')
    expect(workbook.subarray(0, 2).toString()).toBe('PK')
    expect(workbook.length).toBeGreaterThan(1_000)
  })
})
