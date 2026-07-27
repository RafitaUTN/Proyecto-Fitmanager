import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { firmarToken, firmarRefreshToken } from '../lib/jwt'
import { AppError } from '../lib/errors'
import type { LoginClienteDto } from '../dtos/auth.dto'

export const clienteAuthService = {
  async login(dto: LoginClienteDto) {
    const cliente = await prisma.cliente.findUnique({
      where: { correo: dto.correo },
    })

    if (!cliente) {
      throw new AppError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS')
    }
    if (!cliente.estado) {
      throw new AppError('Cliente inactivo. Contacta al administrador.', 401, 'CLIENTE_INACTIVO')
    }
    if (!cliente.contrasena) {
      throw new AppError('Acceso no habilitado. Solicita a tu gimnasio que genere tu acceso.', 401, 'ACCESO_NO_HABILITADO')
    }

    const valida = await bcrypt.compare(dto.password, cliente.contrasena)
    if (!valida) {
      throw new AppError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS')
    }

    // Update last access
    await prisma.cliente.update({
      where: { id_cliente: cliente.id_cliente },
      data: { ultimo_acceso: new Date() },
    })

    const payload = {
      id_usuario: Number(cliente.id_cliente),
      id_gimnasio: Number(cliente.id_gimnasio),
      rol: 'Cliente',
    }

    const token = firmarToken(payload)
    const refreshToken = firmarRefreshToken(payload)

    return {
      token,
      refreshToken,
      cliente: {
        id_cliente: Number(cliente.id_cliente),
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        correo: cliente.correo,
        contrasena_temporal: cliente.contrasena_temporal,
      },
    }
  },

  async generarAcceso(idCliente: bigint, idGimnasio: bigint) {
    const cliente = await prisma.cliente.findUnique({ where: { id_cliente: idCliente } })
    if (!cliente || cliente.id_gimnasio !== idGimnasio) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 })
    }

    const passwordPlano = crypto.randomBytes(4).toString('hex')
    const hash = await bcrypt.hash(passwordPlano, 10)

    await prisma.cliente.update({
      where: { id_cliente: idCliente },
      data: { contrasena: hash, contrasena_temporal: true },
    })

    return { password_temporal: passwordPlano }
  },

  async cambiarPassword(idCliente: bigint, passwordActual: string, passwordNueva: string) {
    const cliente = await prisma.cliente.findUnique({ where: { id_cliente: idCliente } })
    if (!cliente || !cliente.contrasena) {
      throw new AppError('Cliente no encontrado o acceso no habilitado', 404, 'NO_ENCONTRADO')
    }

    const valida = await bcrypt.compare(passwordActual, cliente.contrasena)
    if (!valida) {
      throw new AppError('La contraseña actual no es correcta', 401, 'CONTRASENA_INCORRECTA')
    }

    const hash = await bcrypt.hash(passwordNueva, 10)
    await prisma.cliente.update({
      where: { id_cliente: idCliente },
      data: { contrasena: hash, contrasena_temporal: false },
    })
  },
}
