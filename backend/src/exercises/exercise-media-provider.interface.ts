/**
 * Módulo de catálogo de ejercicios exercise-media-provider.interface.
 *
 * @remarks Valida o consulta media externa manteniendo controles de seguridad como límites de proveedor y URL segura.
 */
export interface ExerciseMediaResult {
  id_externo: string
  nombre: string
  descripcion?: string
  imagen_url: string
  tipo_media: 'imagen'
  grupo_muscular?: string
  equipo?: string
  musculos_secundarios: string[]
  licencia?: string
  autor?: string
  fuente: string
}

export interface ExerciseMediaProvider {
  readonly nombre: string
  buscar(query: string, limite?: number): Promise<ExerciseMediaResult[]>
}
