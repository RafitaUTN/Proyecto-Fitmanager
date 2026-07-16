import { z } from 'zod'

export const crearClienteSchema = z.object({
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  cedula: z.string().min(1).max(20),
  telefono: z.string().max(20).optional(),
  correo: z.string().email().max(150),
  fecha_nacimiento: z.string().optional(),
})

export const actualizarClienteSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellido: z.string().min(1).max(100).optional(),
  cedula: z.string().min(1).max(20).optional(),
  telefono: z.string().max(20).optional(),
  correo: z.string().email().max(150).optional(),
  fecha_nacimiento: z.string().optional(),
  estado: z.boolean().optional(),
})

export type CrearClienteDto = z.infer<typeof crearClienteSchema>
export type ActualizarClienteDto = z.infer<typeof actualizarClienteSchema>
