import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { firmarToken, firmarRefreshToken } from '../lib/jwt'
import { hashToken } from '../lib/token-hash'
import { authRepository } from '../repositories/auth.repository'
import { AppError } from '../lib/errors'
import type { LoginClienteDto } from '../dtos/auth.dto'

export const clienteAuthService = {
  async login(dto: LoginClienteDto) {
    const cliente = await prisma.cliente.findUnique({ where: { correo: dto.correo }, include: { gimnasio: { select: { estado: true } } } })
    if (!cliente || !cliente.estado || !cliente.gimnasio.estado || !cliente.contrasena || !await bcrypt.compare(dto.password, cliente.contrasena)) {
      throw new AppError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS')
    }
    const payload = { id_usuario: Number(cliente.id_cliente), id_gimnasio: Number(cliente.id_gimnasio), rol: 'Cliente' }
    const token = firmarToken(payload)
    const refreshToken = firmarRefreshToken(payload)
    await prisma.$transaction(async (tx) => {
      await tx.cliente.update({ where: { id_cliente: cliente.id_cliente }, data: { ultimo_acceso: new Date() } })
      await authRepository.guardarRefreshTokenCliente(
        cliente.id_cliente, hashToken(refreshToken), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), tx,
      )
    })
    return {
      token,
      refreshToken,
      cliente: { id_cliente: Number(cliente.id_cliente), nombre: cliente.nombre, apellido: cliente.apellido, correo: cliente.correo },
    }
  },

  async cambiarPassword(idCliente: bigint, passwordActual: string, passwordNueva: string) {
    const cliente = await prisma.cliente.findUnique({ where: { id_cliente: idCliente } })
    if (!cliente?.contrasena) throw new AppError('Cliente no encontrado o acceso no habilitado', 404, 'NO_ENCONTRADO')
    if (!await bcrypt.compare(passwordActual, cliente.contrasena)) {
      throw new AppError('La contraseña actual no es correcta', 401, 'CONTRASENA_INCORRECTA')
    }
    const hash = await bcrypt.hash(passwordNueva, 12)
    await prisma.$transaction(async (tx) => {
      await tx.cliente.update({ where: { id_cliente: idCliente }, data: { contrasena: hash } })
      await authRepository.limpiarRefreshTokensCliente(idCliente, tx)
    })
  },
}
