import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { reporteRepository } from '../repositories/reporte.repository'

export const reporteService = {
  async ingresosMensuales(idGimnasio: bigint, inicio?: string, fin?: string) {
    const { fechaInicio, fechaFin } = calcularRango(inicio, fin)
    return reporteRepository.ingresosMensuales(idGimnasio, fechaInicio, fechaFin)
  },

  async nuevosClientes(idGimnasio: bigint, inicio?: string, fin?: string) {
    const { fechaInicio, fechaFin } = calcularRango(inicio, fin)
    return reporteRepository.nuevosClientes(idGimnasio, fechaInicio, fechaFin)
  },

  async asistencias(idGimnasio: bigint, inicio?: string, fin?: string) {
    const { fechaInicio, fechaFin } = calcularRango(inicio, fin)
    return reporteRepository.asistencias(idGimnasio, fechaInicio, fechaFin)
  },

  async distribucionMembresias(idGimnasio: bigint) {
    return reporteRepository.distribucionMembresias(idGimnasio)
  },

  async metodosPago(idGimnasio: bigint, inicio?: string, fin?: string) {
    const { fechaInicio, fechaFin } = calcularRango(inicio, fin)
    return reporteRepository.metodosPago(idGimnasio, fechaInicio, fechaFin)
  },

  async ingresosDiarios(idGimnasio: bigint, inicio?: string, fin?: string) {
    const { fechaInicio, fechaFin } = calcularRango(inicio, fin)
    return reporteRepository.ingresosDiarios(idGimnasio, fechaInicio, fechaFin)
  },

  async asistenciasPorHora(idGimnasio: bigint, inicio?: string, fin?: string) {
    const { fechaInicio, fechaFin } = calcularRango(inicio, fin)
    return reporteRepository.asistenciasPorHora(idGimnasio, fechaInicio, fechaFin)
  },

  async clientesActivosVsInactivos(idGimnasio: bigint) {
    return reporteRepository.clientesActivosVsInactivos(idGimnasio)
  },

  async exportarConGraficos(idGimnasio: bigint, tipo: string, formato: string, nombreGimnasio: string, graficos: string[], inicio?: string, fin?: string) {
    const { fechaInicio, fechaFin } = calcularRango(inicio, fin)
    const dataCsv = await reporteRepository.exportar(idGimnasio, tipo, fechaInicio, fechaFin)
    const periodoStr = `${fmtDateShort(fechaInicio)} - ${fmtDateShort(fechaFin)}`
    const generadoStr = fmtDateShort(new Date())
    const tipoLabel = tipo.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const gymName = nombreGimnasio || 'Gimnasio'

    if (formato === 'xlsx') {
      const buf = await csvToXlsx(dataCsv, tipoLabel, gymName, periodoStr, generadoStr, graficos)
      return { data: buf, ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    }

    if (formato === 'pdf') {
      const buf = await csvToPdf(dataCsv, tipoLabel, gymName, periodoStr, generadoStr, graficos)
      return { data: buf, ext: 'pdf', mime: 'application/pdf' }
    }

    return { data: '\uFEFF' + dataCsv, ext: 'csv', mime: 'text/csv; charset=utf-8' }
  },

  async exportar(idGimnasio: bigint, tipo: string, formato: string, nombreGimnasio: string, inicio?: string, fin?: string) {
    const { fechaInicio, fechaFin } = calcularRango(inicio, fin)
    const dataCsv = await reporteRepository.exportar(idGimnasio, tipo, fechaInicio, fechaFin)
    const periodoStr = `${fmtDateShort(fechaInicio)} - ${fmtDateShort(fechaFin)}`
    const generadoStr = fmtDateShort(new Date())
    const tipoLabel = tipo.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const gymName = nombreGimnasio || 'Gimnasio'

    if (formato === 'csv') {
      const header = [
        `# FitManager - ${tipoLabel}`,
        `# Gimnasio: ${gymName}`,
        `# Período: ${periodoStr}`,
        `# Generado: ${generadoStr}`,
        '',
      ].join('\n')
      return { data: '\uFEFF' + header + dataCsv, ext: 'csv', mime: 'text/csv; charset=utf-8' }
    }

    if (formato === 'xlsx') {
      const buf = await csvToXlsx(dataCsv, tipoLabel, gymName, periodoStr, generadoStr)
      return { data: buf, ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    }

    if (formato === 'pdf') {
      const buf = await csvToPdf(dataCsv, tipoLabel, gymName, periodoStr, generadoStr)
      return { data: buf, ext: 'pdf', mime: 'application/pdf' }
    }

    return { data: '\uFEFF' + dataCsv, ext: 'csv', mime: 'text/csv; charset=utf-8' }
  },
}

function calcularRango(inicio?: string, fin?: string) {
  const ahora = new Date()
  const fechaFin = fin ? new Date(fin + 'T23:59:59.999Z') : new Date(ahora)
  const fechaInicio = inicio
    ? new Date(inicio + 'T00:00:00.000Z')
    : new Date(ahora.getFullYear() - 1, ahora.getMonth(), 1)
  return { fechaInicio, fechaFin }
}

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function csvToXlsx(rawCsv: string, tipoLabel: string, gymName: string, periodoStr: string, generadoStr: string, graficos?: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Reporte')

  ws.mergeCells('A1:D1')
  ws.getCell('A1').value = `FitManager - ${tipoLabel}`
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFF97316' } }

  ws.mergeCells('A2:D2')
  ws.getCell('A2').value = `Gimnasio: ${gymName}`
  ws.getCell('A2').font = { size: 11 }

  ws.mergeCells('A3:D3')
  ws.getCell('A3').value = `Período: ${periodoStr}`
  ws.getCell('A3').font = { size: 10, color: { argb: 'FF64748B' } }

  ws.mergeCells('A4:D4')
  ws.getCell('A4').value = `Generado: ${generadoStr}`
  ws.getCell('A4').font = { size: 10, color: { argb: 'FF64748B' } }

  const lines = rawCsv.trim().split('\n')
  if (lines.length === 0) { const buf = await wb.xlsx.writeBuffer(); return Buffer.from(buf) }

  const headers = parseCsvLine(lines[0])
  const headerRow = ws.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } }
    cell.alignment = { horizontal: 'center' }
  })

  let totalSum = 0
  let countSum = 0
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i])
    const row = ws.addRow(vals)
    row.alignment = { horizontal: 'left' }
    const num = parseFloat(vals[1]?.replace(/[₡,]/g, ''))
    if (!isNaN(num)) totalSum += num
    const cnt = parseInt(vals[2], 10)
    if (!isNaN(cnt)) countSum += cnt
  }

  if (lines.length > 1) {
    const dataRowCount = lines.length - 1
    ws.addRow([])
    const sumRow = ws.addRow(['Total general', totalSum > 0 ? `₡${totalSum.toLocaleString()}` : '', countSum > 0 ? String(countSum) : ''])
    sumRow.eachCell((cell, col) => {
      cell.font = { bold: true, size: 11 }
    })
  }

  if (graficos && graficos.length > 0) {
    const imgStartRow = ws.rowCount + 2
    ws.addRow([])
    ws.addRow(['Gráficos del reporte'])
    ws.getCell(`A${ws.rowCount}`).font = { bold: true, size: 12, color: { argb: 'FFF97316' } }
    ws.addRow([])
    for (let i = 0; i < graficos.length; i++) {
      const base64 = graficos[i].replace(/^data:image\/\w+;base64,/, '')
      const imageId = wb.addImage({ base64, extension: 'png' })
      const rowIdx = imgStartRow + 3 + i * 22
      ws.addImage(imageId, { tl: { col: 0, row: rowIdx }, ext: { width: 500, height: 250 } })
    }
  }

  ws.columns.forEach(c => { if (c.values) c.width = 22 })

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
    current += ch
  }
  result.push(current.trim())
  return result
}

function csvToPdf(rawCsv: string, tipoLabel: string, gymName: string, periodoStr: string, generadoStr: string, graficos?: string[]): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#F97316').text('FitManager', { align: 'center' })
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(tipoLabel, { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(9).fillColor('#64748B').text(`Gimnasio: ${gymName}`, { align: 'center' })
    doc.text(`Período: ${periodoStr}`, { align: 'center' })
    doc.text(`Generado: ${generadoStr}`, { align: 'center' })
    doc.moveDown()

    const lines = rawCsv.trim().split('\n')
    if (lines.length === 0) { doc.end(); return }

    const headers = parseCsvLine(lines[0])
    const colCount = headers.length
    const colWidth = Math.min((doc.page.width - 80) / colCount, 180)

    doc.font('Helvetica-Bold').fontSize(9)
    let y = doc.y + 4
    headers.forEach((h, i) => {
      doc.rect(40 + i * colWidth, y, colWidth, 18).fill('#F97316')
      doc.fillColor('#FFFFFF').text(h, 42 + i * colWidth, y + 4, { width: colWidth - 4, align: 'left' })
    })

    doc.font('Helvetica').fontSize(8.5)
    y += 18
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCsvLine(lines[i])
      if (y > doc.page.height - 40) { doc.addPage(); y = 40 }
      doc.fillColor('#000000')
      vals.forEach((v, j) => {
        doc.text(v, 42 + j * colWidth, y + 2, { width: colWidth - 4, align: 'left' })
      })
      y += 16
    }

    if (lines.length > 1) {
      y += 8
      doc.moveTo(40, y).lineTo(40 + colCount * colWidth, y).strokeColor('#CBD5E1').stroke()
      y += 6
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B')
      doc.text('Total registros:', 42, y, { width: colWidth - 4, align: 'left' })
      doc.text(String(lines.length - 1), 42 + colWidth, y, { width: colWidth - 4, align: 'left' })
    }

    if (graficos && graficos.length > 0) {
      y += 20
      if (y > doc.page.height - 200) { doc.addPage(); y = 40 }
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#F97316').text('Gráficos del reporte', 40, y)
      y += 10
      for (let i = 0; i < graficos.length; i++) {
        if (y > doc.page.height - 260) { doc.addPage(); y = 40; doc.font('Helvetica-Bold').fontSize(12).fillColor('#F97316').text('Gráficos del reporte', 40, y); y += 10 }
        const imgBuf = Buffer.from(graficos[i].replace(/^data:image\/\w+;base64,/, ''), 'base64')
        try {
          doc.image(imgBuf, 40, y, { width: Math.min(500, doc.page.width - 80), height: 220 })
          y += 230
        } catch { }
      }
    }

    doc.end()
  })
}
