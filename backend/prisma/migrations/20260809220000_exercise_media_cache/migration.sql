-- Caché del catálogo externo de ejercicios (proveedor Wger).
-- Clave natural: término de búsqueda normalizado. El resultado JSON guarda
-- metadatos (nombre, imagen, licencia, autor) para atribución correcta.
CREATE TABLE "ejercicio_media_cache" (
    "clave" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL DEFAULT 'wger',
    "resultado" JSONB NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ejercicio_media_cache_pkey" PRIMARY KEY ("clave")
);

CREATE INDEX "ejercicio_media_cache_proveedor_actualizado_en_idx" ON "ejercicio_media_cache"("proveedor", "actualizado_en");
