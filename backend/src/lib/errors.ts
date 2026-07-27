/** Error personalizado con código máquina y status HTTP para el manejador global. */
export class AppError extends Error {
  /** Código HTTP de la respuesta. */
  statusCode: number
  /** Código máquina para que el frontend identifique el error. */
  codigo: string
  /** Datos adicionales estructurados (cliente, gimnasio, etc.). */
  data?: Record<string, unknown>

  /**
   * @param message Mensaje legible para el frontend.
   * @param statusCode Código HTTP (400, 403, 404, 409, 500, etc.).
   * @param codigo Identificador único del error (CLIENTE_ACTIVO_OTRO_GYM, etc.).
   * @param data Payload adicional que se incluirá en la respuesta JSON.
   */
  constructor(message: string, statusCode: number, codigo: string, data?: Record<string, unknown>) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.codigo = codigo
    this.data = data
  }
}
