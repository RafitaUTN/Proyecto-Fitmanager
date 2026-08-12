import { validarUrlMedia, validarBaseUrlMedia } from './media-url-validation'
import type { ExerciseMediaProvider, ExerciseMediaResult } from './exercise-media-provider.interface'

export interface WgerProviderOptions {
  baseUrl?: string
  timeoutMs?: number
  languageIds?: number[]
  fetchImpl?: typeof fetch
}

const LANGUAGE_ES = 4
const LANGUAGE_EN = 2

interface WgerTraduccion {
  name?: string
  description_source?: string
  language: number
}

interface WgerImagen {
  image?: string
  is_main?: boolean
}

export function crearWgerMediaProvider(options: WgerProviderOptions = {}): ExerciseMediaProvider {
  const baseUrl = validarBaseUrlMedia(options.baseUrl || 'https://wger.de')
  const timeoutMs = options.timeoutMs ?? 6000
  const languageIds = options.languageIds ?? [LANGUAGE_ES, LANGUAGE_EN]
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const nombre = 'wger'

  function elegirTraduccion(traducciones: WgerTraduccion[] | undefined): WgerTraduccion | null {
    const conNombre = (traducciones ?? []).filter((t) => t && typeof t.name === 'string' && t.name.trim().length > 0)
    if (conNombre.length === 0) return null
    for (const lang of languageIds) {
      const match = conNombre.find((t) => t.language === lang)
      if (match) return match
    }
    return conNombre[0]
  }

  function imagenPrincipal(images: WgerImagen[] | undefined): string | null {
    const validas = (images ?? []).filter((i) => i && typeof i.image === 'string')
    const main = validas.find((_, idx) => images![idx]?.is_main === true)
    const candidata = (main ?? validas[0])?.image
    if (!candidata) return null
    const validacion = validarUrlMedia(candidata)
    return validacion.ok ? validacion.url : null
  }

  function limpiarHtml(texto: string | undefined): string | undefined {
    if (!texto) return undefined
    const limpio = texto.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!limpio) return undefined
    return limpio.length > 1200 ? `${limpio.slice(0, 1200)}…` : limpio
  }

  function mapear(item: Record<string, unknown> | undefined | null): ExerciseMediaResult | null {
    if (!item || typeof item !== 'object') return null

    const traduccion = elegirTraduccion(item.translations as WgerTraduccion[] | undefined)
    const nombre = traduccion?.name
    if (!nombre) return null

    const imagenUrl = imagenPrincipal(item.images as WgerImagen[] | undefined)
    if (!imagenUrl) return null

    const descripcion = limpiarHtml(traduccion?.description_source)
    const musculos = Array.isArray(item.muscles_secondary)
      ? (item.muscles_secondary as Array<Record<string, unknown>>)
          .map((m) => (typeof m?.name_en === 'string' ? m.name_en : typeof m?.name === 'string' ? m.name : undefined))
          .filter((n): n is string => Boolean(n))
          .slice(0, 10)
      : []

    const equipo = Array.isArray(item.equipment) && item.equipment[0]
      ? String((item.equipment[0] as Record<string, unknown>)?.name ?? '')
      : ''
    const grupoMuscular = item.category && typeof item.category === 'object'
      ? String((item.category as Record<string, unknown>)?.name ?? '')
      : ''

    const resultado: ExerciseMediaResult = {
      id_externo: String(item.id ?? ''),
      nombre,
      imagen_url: imagenUrl,
      tipo_media: 'imagen',
      musculos_secundarios: musculos,
      fuente: nombre,
    }
    if (descripcion) resultado.descripcion = descripcion
    if (grupoMuscular) resultado.grupo_muscular = grupoMuscular
    if (equipo) resultado.equipo = equipo
    if (item.license && typeof item.license === 'object' && (item.license as Record<string, unknown>).short_name) {
      resultado.licencia = String((item.license as Record<string, unknown>).short_name)
    }
    if (typeof item.license_author === 'string' && item.license_author.trim()) {
      resultado.autor = item.license_author.trim()
    }
    return resultado
  }

  async function buscar(query: string, limite = 8): Promise<ExerciseMediaResult[]> {
    const limpia = query.trim()
    if (!limpia) return []

    const limiteReal = Math.min(Math.max(1, Math.floor(limite)), 20)
    const url = `${baseUrl}/api/v2/exerciseinfo/?format=json&limit=${limiteReal + 2}&name=${encodeURIComponent(limpia)}`

    const respuesta = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FitManager/1.0 (sincronizacion de catalogo de ejercicios)',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!respuesta.ok) {
      throw new Error(`El catálogo externo respondió ${respuesta.status}`)
    }

    const cuerpo = (await respuesta.json()) as { results?: Array<Record<string, unknown>> }
    const results = Array.isArray(cuerpo?.results) ? cuerpo.results : []
    return results
      .map(mapear)
      .filter((r): r is ExerciseMediaResult => r !== null)
      .slice(0, limiteReal)
  }

  return { nombre, buscar }
}
