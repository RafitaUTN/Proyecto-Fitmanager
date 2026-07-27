import { z } from 'zod'

export const registrarEntradaSchema = z.object({
  id_cliente: z.coerce.number().int().positive(),
  metodo: z.enum(['manual', 'qr', 'nfc']).default('manual'),
})

export const registrarSalidaSchema = z.object({
  id_asistencia: z.coerce.number().int().positive(),
})

export const listarAsistenciasSchema = z.object({
  id_cliente: z.coerce.number().int().positive().optional(),
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
  solo_dentro: z.coerce.boolean().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
})

export type RegistrarEntradaDto = z.infer<typeof registrarEntradaSchema>
export type RegistrarSalidaDto = z.infer<typeof registrarSalidaSchema>
export type ListarAsistenciasDto = z.infer<typeof listarAsistenciasSchema>
