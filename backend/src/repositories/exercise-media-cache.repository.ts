import { prisma } from '../lib/prisma'
import type { Prisma } from '../generated/prisma/client'
import type { ExerciseMediaResult } from '../exercises/exercise-media-provider.interface'

export interface ExerciseMediaCacheEntry {
  resultado: ExerciseMediaResult[]
  actualizadoEn: Date
}

export const exerciseMediaCacheRepository = {
  async buscar(clave: string): Promise<ExerciseMediaCacheEntry | null> {
    const fila = await prisma.ejercicioMediaCache.findUnique({ where: { clave } })
    if (!fila) return null
    return {
      resultado: fila.resultado as unknown as ExerciseMediaResult[],
      actualizadoEn: fila.actualizado_en,
    }
  },

  async guardar(clave: string, resultado: ExerciseMediaResult[]): Promise<void> {
    await prisma.ejercicioMediaCache.upsert({
      where: { clave },
      create: {
        clave,
        proveedor: 'wger',
        resultado: resultado as unknown as Prisma.InputJsonValue,
      },
      update: {
        proveedor: 'wger',
        resultado: resultado as unknown as Prisma.InputJsonValue,
        actualizado_en: new Date(),
      },
    })
  },
}
