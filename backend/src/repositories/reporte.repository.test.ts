import { describe, expect, it } from 'vitest'
import { csvCell } from './reporte.repository'

describe('csvCell', () => {
  it.each(['=1+1', '+cmd', '-2+3', '@SUM(A1:A2)', '\t=cmd', '\r+cmd'])('neutraliza fórmula %j', (input) => {
    expect(csvCell(input)).toContain("'")
    expect(csvCell(input).replace(/^"?'/, '')).toContain(input)
  })

  it('mantiene escape CSV y comillas', () => {
    expect(csvCell('hola, "mundo"')).toBe('"hola, ""mundo"""')
  })
})
