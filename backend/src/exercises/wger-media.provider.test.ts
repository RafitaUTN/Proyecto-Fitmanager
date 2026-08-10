import { describe, it, expect, vi } from 'vitest'
import { crearWgerMediaProvider } from './wger-media.provider'

function respuestaConResults(results: unknown[], count = results.length) {
  return { ok: true, status: 200, json: async () => ({ count, results }) } as unknown as Response
}

function ejercicioWger(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    name: undefined,
    category: { name: 'Chest' },
    muscles_secondary: [{ name_en: 'Triceps' }],
    equipment: [{ name: 'Barbell' }],
    license: { short_name: 'CC-BY-SA 4' },
    license_author: 'Wger Team',
    images: [{ image: 'https://wger.de/media/exercise-images/1962/xxx.png', is_main: true }],
    translations: [
      { language: 4, name: 'Press de banca', description_source: '<p>Empuja la barra.</p>' },
      { language: 2, name: 'Bench press', description_source: 'Push the bar.' },
    ],
    ...overrides,
  }
}

describe('crearWgerMediaProvider', () => {
  it('mapea resultados y prioriza la traducción en español', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuestaConResults([ejercicioWger()]))
    const provider = crearWgerMediaProvider({ fetchImpl })

    const resultados = await provider.buscar('press banca')

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const url = String(fetchImpl.mock.calls[0][0])
    expect(url).toContain('/api/v2/exerciseinfo/')
    expect(url).toContain('name=press%20banca')

    expect(resultados).toHaveLength(1)
    expect(resultados[0]).toMatchObject({
      id_externo: '42',
      nombre: 'Press de banca',
      imagen_url: 'https://wger.de/media/exercise-images/1962/xxx.png',
      tipo_media: 'imagen',
      grupo_muscular: 'Chest',
      equipo: 'Barbell',
      licencia: 'CC-BY-SA 4',
      autor: 'Wger Team',
    })
    expect(resultados[0].musculos_secundarios).toEqual(['Triceps'])
    expect(resultados[0].descripcion).toBe('Empuja la barra.')
  })

  it('cae a inglés cuando no hay traducción en español', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuestaConResults([ejercicioWger({
      translations: [{ language: 2, name: 'Bench press', description_source: '' }],
    })]))
    const provider = crearWgerMediaProvider({ fetchImpl })

    const resultados = await provider.buscar('bench press')
    expect(resultados[0].nombre).toBe('Bench press')
    expect(resultados[0].descripcion).toBeUndefined()
  })

  it('descartar items sin nombre, sin imagen o con imagen de host no permitido (anti-SSRF)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuestaConResults([
      { ...ejercicioWger(), translations: [] },
      { ...ejercicioWger(), images: [] },
      { ...ejercicioWger(), images: [{ image: 'http://evil.com/x.png', is_main: true }] },
      ejercicioWger(),
    ]))
    const provider = crearWgerMediaProvider({ fetchImpl })

    const resultados = await provider.buscar('press')
    expect(resultados).toHaveLength(1)
    expect(resultados[0].nombre).toBe('Press de banca')
  })

  it('devuelve [] cuando no hay resultados y cuando la consulta está vacía', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuestaConResults([]))
    const provider = crearWgerMediaProvider({ fetchImpl })

    expect(await provider.buscar('xyz-inventado')).toEqual([])
    expect(await provider.buscar('   ')).toEqual([])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('lanza error cuando el proveedor externo falla', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 } as unknown as Response)
    const provider = crearWgerMediaProvider({ fetchImpl })

    await expect(provider.buscar('press')).rejects.toThrow(/503/)
  })

  it('limita y recorta el límite dentro del rango permitido', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuestaConResults(Array.from({ length: 25 }, (_, i) => ejercicioWger({ id: i + 1 })), 844))
    const provider = crearWgerMediaProvider({ fetchImpl })

    const resultados = await provider.buscar('press', 4)
    expect(resultados).toHaveLength(4)
    const url = String(fetchImpl.mock.calls[0][0])
    expect(url).toContain('limit=6')
  })
})
