export class AppError extends Error {
  statusCode: number
  codigo: string

  constructor(message: string, statusCode: number, codigo: string) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.codigo = codigo
  }
}
