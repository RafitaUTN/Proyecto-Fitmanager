import { z } from 'zod'

export const registrarGimnasioSchema = z.object({
  nombre: z.string().min(1).max(100),
  correo: z.string().email().max(150),
  telefono: z.string().max(20).optional(),
  direccion: z.string().optional(),
  usuario: z.object({
    nombre: z.string().min(1).max(100),
    apellido: z.string().min(1).max(100),
    correo: z.string().email().max(150),
    password: z.string().min(6).max(100),
  }),
})

export type RegistrarGimnasioDto = z.infer<typeof registrarGimnasioSchema>
