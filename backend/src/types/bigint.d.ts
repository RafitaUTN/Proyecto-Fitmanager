/**
 * Tipos compartidos bigint.d para la API.
 *
 * @remarks Extiende contratos TypeScript usados por Express, serialización o contexto autenticado.
 */
interface BigInt {
  toJSON(): number | string
}
