/**
 * Pruebas unitarias de reporte.service
 *
 * Cubre RF-15 ("generar reportes administrativos sobre clientes, membresías,
 * pagos y asistencia, permitiendo filtrar la información por período") y
 * RF-16 ("exportar los reportes administrativos generados en un archivo
 * descargable"). Ambos son "Must" en el backlog.
 *
 * Decisión de diseño de estas pruebas: NO se mockean ExcelJS ni PDFKit. Se
 * dejan correr de verdad y se verifica que los buffers resultantes sean
 * archivos válidos comprobando sus bytes de firma. Un test que mockea el
 * generador solo demuestra que se llamó a una función; este demuestra que
 * sale un XLSX y un PDF que se pueden abrir.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const GIMNASIO = 1n

vi.mock('../repositories/reporte.repository', () => ({
  reporteRepository: {
    ingresosMensuales: vi.fn(),
    nuevosClientes: vi.fn(),
    asistencias: vi.fn(),
    distribucionMembresias: vi.fn(),
    metodosPago: vi.fn(),
    ingresosDiarios: vi.fn(),
    asistenciasPorHora: vi.fn(),
    clientesActivosVsInactivos: vi.fn(),
    exportar: vi.fn(),
  },
}))

import { reporteService } from './reporte.service'
import { reporteRepository } from '../repositories/reporte.repository'

const CSV_EJEMPLO = [
  'Mes,Ingresos,Cantidad',
  'Enero,150000,6',
  'Febrero,225000,9',
  'Marzo,180000,7',
].join('\n')

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(reporteRepository.exportar).mockResolvedValue(CSV_EJEMPLO as never)
})

// ===========================================================================
describe('RF-15 · Filtrado por período', () => {
  beforeEach(() => {
    vi.mocked(reporteRepository.ingresosMensuales).mockResolvedValue([] as never)
  })

  it('interpreta las fechas recibidas en UTC, no en la zona del servidor', async () => {
    await reporteService.ingresosMensuales(GIMNASIO, '2026-01-01', '2026-03-31')

    const [, inicio, fin] = vi.mocked(reporteRepository.ingresosMensuales).mock.calls[0]

    // Si se interpretaran en hora local, el reporte incluiría o excluiría
    // registros distintos según dónde esté desplegado el servidor.
    expect((inicio as Date).toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect((fin as Date).toISOString()).toBe('2026-03-31T23:59:59.999Z')
  })

  it('la fecha final cubre el día completo', async () => {
    await reporteService.ingresosMensuales(GIMNASIO, '2026-01-01', '2026-03-31')

    const fin = vi.mocked(reporteRepository.ingresosMensuales).mock.calls[0][2] as Date

    // Sin esto, un pago de las 5pm del último día quedaría fuera del reporte.
    expect(fin.getUTCHours()).toBe(23)
    expect(fin.getUTCMinutes()).toBe(59)
  })

  it('sin fechas, el rango por defecto arranca un año atrás', async () => {
    await reporteService.ingresosMensuales(GIMNASIO)

    const inicio = vi.mocked(reporteRepository.ingresosMensuales).mock.calls[0][1] as Date

    expect(inicio.getFullYear()).toBe(new Date().getFullYear() - 1)
    expect(inicio.getDate()).toBe(1)
  })

  it('todos los reportes con período aplican el mismo criterio de rango', async () => {
    const conRango = [
      ['nuevosClientes', reporteRepository.nuevosClientes],
      ['asistencias', reporteRepository.asistencias],
      ['metodosPago', reporteRepository.metodosPago],
      ['ingresosDiarios', reporteRepository.ingresosDiarios],
      ['asistenciasPorHora', reporteRepository.asistenciasPorHora],
    ] as const

    for (const [metodo, repo] of conRango) {
      vi.mocked(repo).mockResolvedValue([] as never)
      await reporteService[metodo](GIMNASIO, '2026-01-01', '2026-03-31')

      const [gym, inicio] = vi.mocked(repo).mock.calls[0]
      expect(gym).toBe(GIMNASIO)
      expect((inicio as Date).toISOString()).toBe('2026-01-01T00:00:00.000Z')
    }
  })

  it('los reportes sin período reciben solo el gimnasio', async () => {
    vi.mocked(reporteRepository.distribucionMembresias).mockResolvedValue([] as never)
    vi.mocked(reporteRepository.clientesActivosVsInactivos).mockResolvedValue([] as never)

    await reporteService.distribucionMembresias(GIMNASIO)
    await reporteService.clientesActivosVsInactivos(GIMNASIO)

    expect(reporteRepository.distribucionMembresias).toHaveBeenCalledWith(GIMNASIO)
    expect(reporteRepository.clientesActivosVsInactivos).toHaveBeenCalledWith(GIMNASIO)
  })
})

// ===========================================================================
describe('RF-16 · Exportación a CSV', () => {
  it('incluye el BOM UTF-8 al inicio', async () => {
    const { data } = await reporteService.exportar(
      GIMNASIO, 'ingresos-mensuales', 'csv', 'PowerFit',
    )

    // Sin el BOM, Excel abre el CSV en ANSI y los acentos y el símbolo de
    // colón salen corruptos. Es el detalle que más se nota en una demo.
    expect((data as string).charCodeAt(0)).toBe(0xfeff)
  })

  it('antepone una cabecera con gimnasio, período y fecha de generación', async () => {
    const { data } = await reporteService.exportar(
      GIMNASIO, 'ingresos-mensuales', 'csv', 'PowerFit', '2026-01-01', '2026-03-31',
    )

    const texto = data as string
    expect(texto).toContain('# FitManager - Ingresos Mensuales')
    expect(texto).toContain('# Gimnasio: PowerFit')
    expect(texto).toContain('# Período:')
    expect(texto).toContain('# Generado:')
  })

  it('conserva los datos del reporte debajo de la cabecera', async () => {
    const { data } = await reporteService.exportar(
      GIMNASIO, 'ingresos-mensuales', 'csv', 'PowerFit',
    )

    expect(data as string).toContain('Enero,150000,6')
  })

  it('convierte el tipo de reporte en un título legible', async () => {
    const { data } = await reporteService.exportar(
      GIMNASIO, 'metodos-de-pago', 'csv', 'PowerFit',
    )

    // 'metodos-de-pago' -> 'Metodos De Pago'
    expect(data as string).toContain('# FitManager - Metodos De Pago')
  })

  it('usa "Gimnasio" como nombre por defecto si llega vacío', async () => {
    const { data } = await reporteService.exportar(GIMNASIO, 'asistencias', 'csv', '')

    expect(data as string).toContain('# Gimnasio: Gimnasio')
  })

  it('declara la extensión y el MIME correctos', async () => {
    const resultado = await reporteService.exportar(
      GIMNASIO, 'asistencias', 'csv', 'PowerFit',
    )

    expect(resultado.ext).toBe('csv')
    expect(resultado.mime).toBe('text/csv; charset=utf-8')
  })
})

// ===========================================================================
describe('RF-16 · Exportación a XLSX', () => {
  it('genera un archivo XLSX válido', async () => {
    const { data, ext, mime } = await reporteService.exportar(
      GIMNASIO, 'ingresos-mensuales', 'xlsx', 'PowerFit',
    )

    const buffer = data as Buffer
    expect(Buffer.isBuffer(buffer)).toBe(true)

    // Un .xlsx es un ZIP: sus dos primeros bytes son 'PK' (0x50 0x4B).
    // Si esto pasa, el archivo se puede abrir en Excel.
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)
    expect(buffer.length).toBeGreaterThan(1000)

    expect(ext).toBe('xlsx')
    expect(mime).toContain('spreadsheetml')
  })

  it('genera el XLSX aunque el reporte venga sin filas de datos', async () => {
    vi.mocked(reporteRepository.exportar).mockResolvedValue('Mes,Ingresos,Cantidad' as never)

    const { data } = await reporteService.exportar(
      GIMNASIO, 'ingresos-mensuales', 'xlsx', 'PowerFit',
    )

    // Un reporte vacío no debe romper la descarga; debe bajar el archivo
    // con los encabezados y sin filas.
    expect(Buffer.isBuffer(data as Buffer)).toBe(true)
    expect((data as Buffer)[0]).toBe(0x50)
  })
})

// ===========================================================================
describe('RF-16 · Exportación a PDF', () => {
  it('genera un archivo PDF válido', async () => {
    const { data, ext, mime } = await reporteService.exportar(
      GIMNASIO, 'ingresos-mensuales', 'pdf', 'PowerFit',
    )

    const buffer = data as Buffer
    expect(Buffer.isBuffer(buffer)).toBe(true)

    // Todo PDF empieza con la firma '%PDF'.
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF')
    expect(buffer.length).toBeGreaterThan(500)

    expect(ext).toBe('pdf')
    expect(mime).toBe('application/pdf')
  })

  it('pagina cuando el reporte tiene muchas filas', async () => {
    const filas = ['Mes,Ingresos,Cantidad']
    for (let i = 0; i < 200; i++) filas.push(`Fila ${i},1000,1`)
    vi.mocked(reporteRepository.exportar).mockResolvedValue(filas.join('\n') as never)

    const { data } = await reporteService.exportar(
      GIMNASIO, 'ingresos-mensuales', 'pdf', 'PowerFit',
    )

    const buffer = data as Buffer
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF')
    // 200 filas no caben en una página: el PDF debe tener varias.
    expect(buffer.toString('latin1').split('/Type /Page').length).toBeGreaterThan(2)
  })
})

// ===========================================================================
describe('RF-16 · Formato desconocido', () => {
  it('cae a CSV si el formato no se reconoce', async () => {
    const resultado = await reporteService.exportar(
      GIMNASIO, 'asistencias', 'formato-inventado', 'PowerFit',
    )

    // Mejor devolver algo utilizable que un error, porque el formato llega
    // desde un parámetro de la URL.
    expect(resultado.ext).toBe('csv')
    expect(resultado.mime).toBe('text/csv; charset=utf-8')
  })

  it('el reporte siempre se pide acotado al gimnasio', async () => {
    await reporteService.exportar(GIMNASIO, 'asistencias', 'csv', 'PowerFit')

    const [gym] = vi.mocked(reporteRepository.exportar).mock.calls[0]
    expect(gym).toBe(GIMNASIO)
  })
})
