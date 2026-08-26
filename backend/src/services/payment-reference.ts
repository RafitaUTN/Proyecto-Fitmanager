/**
 * Servicio de negocio del módulo payment-reference.
 *
 * @remarks Contiene reglas del dominio FitManager y coordina repositorios, transacciones y efectos secundarios.
 */
const METODOS_CON_REFERENCIA = new Set(['tarjeta', 'transferencia', 'sinpe'])

export function normalizarMetodoPago(metodo: string) {
  return metodo.trim().toLowerCase()
}

export function requiresPaymentReference(metodo: string) {
  return METODOS_CON_REFERENCIA.has(normalizarMetodoPago(metodo))
}

export function normalizarReferenciaPago(referencia?: string | null) {
  const limpia = referencia?.trim()
  return limpia ? limpia : null
}
