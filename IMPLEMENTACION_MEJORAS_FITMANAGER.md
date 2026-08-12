# Implementación de mejoras FitManager

Fecha de verificación: 9 de agosto de 2026

Rama: `codex/feature/mejoras-fitmanager-ux-negocio`

Base: `main` en `8160f80`

## 1. Estado inicial

La inspección confirmó una arquitectura Express/Prisma por capas, React con TanStack Query y Zustand, aislamiento por `id_gimnasio`, RBAC para personal y portal separado para clientes. El baseline compilaba y pasaba 30 pruebas backend y 16 frontend. Prisma validaba sin drift. El lint tenía una advertencia preexistente de Fast Refresh en `frontend/src/lib/toast.tsx`. Las pruebas de integración se negaban correctamente a arrancar sin `TEST_DATABASE_URL`.

## 2. Rama

Todo el trabajo se realizó fuera de `main`, en `codex/feature/mejoras-fitmanager-ux-negocio`. No se modificaron datos de producción. Integración y E2E utilizaron exclusivamente `fitmanager_test`, `fitmanager_migration_test` y una base efímera `fitmanager_e2e`.

## 3. Commits

- `a26ad77 feat(email): profesionalizar activación y recuperación`
- `0c61d28 fix(client): reparar cambio seguro de contraseña`
- `7037518 feat(auth): ampliar recuperación segura de contraseña`
- `e73c54a refactor(auth): unificar login de personal y clientes`
- `57ac7bf fix(auth): corregir relación de tokens de recuperación`
- `1de02ac feat(payments): soportar pagos parciales y saldos`
- `aad0c1f fix(attendance): exponer entradas activas y salida atómica`
- `af2bd86 feat(notifications): personalizar destinatarios por actor y rol`
- `345ec3a feat(exercises): rediseñar catálogo visual paginado`
- `86d96af feat(routines): enriquecer constructor y portal visual`
- `4dfb37e test(integration): cubrir flujos críticos evolucionados`
- `fd40930 test(e2e): estabilizar regresión visual y por roles`

## 4. Archivos modificados

Los cambios se concentran en:

- Backend: autenticación, recuperación, correo, pagos, asistencias, notificaciones, ejercicios, rutinas, DTO, servicios, repositorios, controladores y rutas.
- Frontend: login/recuperación, perfil del cliente, pagos, asistencias, notificaciones, catálogo de ejercicios, rutinas y guards/RBAC.
- Datos: `schema.prisma`, migraciones con rollback y seed E2E aislado.
- Calidad: pruebas unitarias, integración, 41 escenarios Playwright, OpenAPI y este informe.

El detalle exacto se obtiene con `git diff --stat main...HEAD`.

## 5. Migraciones creadas

| Migración | Propósito | Rollback |
| --- | --- | --- |
| `20260809180000_professional_email_content` | Texto plano en outbox | Sí |
| `20260809181000_unified_identity_recovery` | Tokens para cliente o usuario, con XOR | Sí |
| `20260809182000_personalized_notifications` | Rol destino y URL de acción | Sí |
| `20260809183000_exercise_catalog_media` | Media e información visual de ejercicios | Sí |
| `20260809184000_routine_experience` | Objetivo/duración/dificultad, orden, descanso y notas | Sí |

Las 13 migraciones del proyecto fueron aplicadas desde cero y `prisma migrate diff` no detectó drift.

## 6. Correo profesional

Activación y recuperación usan plantillas HTML table-based, estilos inline, CTA accesible y versión de texto. `FRONTEND_URL` es la única fuente para enlaces. El token sigue siendo criptográficamente aleatorio, se persiste como hash, expira y es de un solo uso. No se registran tokens ni aparecen textos de desarrollo en producción.

## 7. Cambio de contraseña

Se corrigió el contrato frontend/backend y el manejo de errores Zod. La identidad siempre sale de la sesión. Se valida contraseña actual, confirmación, política fuerte de 12 caracteres y diferencia con la clave anterior. La operación actualiza el hash, revoca sesiones y crea notificación de seguridad dentro de una transacción.

## 8. Recuperación

`forgot-password` acepta correo, responde siempre de forma genérica y tiene rate limit específico. Personal y clientes comparten el flujo seguro sin compartir tablas de sesión. Los tokens duran 60 minutos, son de un uso y la recuperación revoca sesiones existentes.

## 9. Login único

Se eliminó el selector Personal/Cliente y `/auth/login-cliente`. `POST /api/auth/login` resuelve una sola identidad y responde `actorType` y `role`. Si un correo existe en ambas tablas se devuelve `IDENTIDAD_AMBIGUA`; nunca se elige al azar. Las altas y ediciones evitan nuevos conflictos entre tablas. Los guards usan actor, rol y permisos centralizados.

## 10. Pagos parciales

El saldo se deriva de precio menos pagos confirmados. Los estados son `PENDIENTE`, `PARCIAL`, `COMPLETADO` y `VENCIDO`. Un lock de fila y transacción impiden carreras, sobrepago y pagos repetidos tras completar. La UI y el portal muestran total, pagado, pendiente, estado y fecha habilitada.

Decisión aplicada: a falta de otro ciclo documentado, el pago se habilita desde `fecha_inicio`, que es la regla temporal existente más cercana. No se inventó crédito ni una fecha arbitraria.

## 11. Asistencias

`GET /api/asistencias/activos` usa como fuente de verdad toda asistencia del tenant con salida nula, aunque la entrada sea de un día anterior. `PATCH /api/asistencias/:id/salida` cierra la fila de manera atómica y rechaza una segunda salida. La UI muestra cards de personas dentro, hora de entrada y duración.

## 12. Notificaciones

Las notificaciones nuevas pueden dirigirse a cliente, usuario o rol dentro de un gimnasio, e incluir acción. Administración y Recepción reciben solo los tipos asignados; Entrenador recibe destinos exactos; Cliente solo los propios. Se corrigió el marcado como leído para evitar IDOR. Los eventos repetibles usan `event_key` para deduplicar.

## 13. Ejercicios

La tabla se reemplazó por un catálogo paginado de cards con búsqueda y filtros por músculo, categoría, nivel y estado. Soporta imagen/animación HTTPS o ruta local, lazy loading, skeleton y fallback. El detalle muestra equipo, instrucciones, músculos secundarios y rutinas relacionadas. CRUD, activación y RBAC permanecen operativos.

No se agregó API externa: se evita costo, dependencia, telemetría de terceros y riesgo de licencia. Los medios son URLs cacheables administradas por el gimnasio.

## 14. Rutinas

Las cards muestran creador, conteos, miniaturas, objetivo, duración y dificultad. El constructor configura series, repeticiones, peso, descanso, notas y orden. Se eligieron botones accesibles Subir/Bajar en lugar de drag-and-drop. La asignación crea un snapshot ordenado para proteger el plan del cliente ante cambios posteriores. El portal es visual y de solo lectura.

## 15. Seguridad

- Tokens de acceso cortos; refresh en cookie segura y protección CSRF existente preservada.
- Password/token nunca se registran.
- DTO Zod para entradas nuevas o ampliadas.
- Locks/transacciones para pagos, salida, contraseñas y rutinas.
- URLs de media restringidas a HTTPS o rutas locales.
- Errores de negocio tienen códigos humanos, sin filtrar Prisma/Zod.
- `npm audit`: 0 vulnerabilidades backend y frontend.

## 16. Multi-tenancy

Todos los recursos nuevos se filtran con gimnasio derivado del JWT. Los tests reales cubren pago, asistencia, notificación, rutina y ejercicio, junto con la suite multi-tenant preexistente. Los endpoints no aceptan un gimnasio arbitrario del frontend.

## 17. RBAC

Administrador conserva gestión completa; Entrenador gestiona ejercicios y sus rutinas/clientes; Recepcionista no accede a ejercicios/rutinas; Cliente solo consume su portal. La regresión Playwright comprueba sidebar, acceso directo por URL y acciones.

## 18. Performance

- Catálogo paginado, máximo 48 elementos por consulta.
- Media con `loading=lazy` y fallback.
- Índice compuesto para filtros de ejercicios y orden de rutinas.
- Consultas con includes/selects acotados e invalidaciones de TanStack específicas.
- `useDeferredValue` evita consultar por cada pulsación inmediata.

## 19. Testing

Resultados finales:

- Backend unitario + integración + cobertura: 20 archivos, 57/57 pruebas.
- Frontend unitario: 4 archivos, 16/16 pruebas.
- Playwright Chromium: 41/41 escenarios sobre DB E2E creada desde cero.
- Migraciones: 13/13 aplicadas desde cero, schema válido, sin drift.
- OpenAPI 3.1: validado con Redocly.
- Verificación manual: login y catálogo mobile 390×844, sin errores de página.

Los flujos de token y correo se prueban en backend con token simulado y outbox; E2E no envía correo real para evitar efectos externos.

## 20. Coverage

| Capa | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Backend (archivos instrumentados por la configuración actual) | 46,12% | 34,90% | 42,34% | 48,17% |
| Frontend | 87,93% | 70,37% | 88,00% | 91,66% |

## 21. Build

Backend TypeScript/Prisma y frontend TypeScript/Vite compilan correctamente. Prisma generate/validate pasan. El frontend conserva una advertencia de chunk del Dashboard de aproximadamente 619 KB.

## 22. CI

El workflow existente valida npm audit, migraciones desde cero, drift, build, cobertura, lint y bundle. Se preservó el guard que exige una base aislada. La suite E2E completa se ejecutó localmente; incorporarla como job CI con navegador y base dedicada sigue siendo una mejora recomendable.

## 23. Problemas adicionales encontrados

- Fixtures E2E incompletos y archivos que dependían del orden/estado de otros tests.
- Selectores E2E ligados a la tabla eliminada.
- `ConfirmDialog` tenía semántica de diálogo aplicada al backdrop.
- El seed E2E usaba top-level await incompatible con el formato de salida actual.
- La cobertura local falla de forma intencional sin `TEST_DATABASE_URL`; se verificó dentro de Docker.

## 24. Decisiones de arquitectura

- Identidad unificada en el servicio, conservando tablas existentes para evitar una migración destructiva.
- Estado de pago derivado en vez de duplicado en DB.
- Snapshot de rutina al asignar para preservar historial.
- Media autogestionada y cacheable, sin proveedor externo.
- Orden accesible mediante controles explícitos.
- Compatibilidad temporal del endpoint POST de salida, con PATCH como contrato recomendado.

## 25. Riesgos pendientes

- La unicidad global de correo entre `Usuario` y `Cliente` se garantiza en la capa de aplicación; PostgreSQL no puede imponer fácilmente un índice único entre dos tablas. Los conflictos históricos se rechazan al iniciar sesión.
- Notificaciones legadas con `rol_destino = null` siguen visibles según compatibilidad; las nuevas son personalizadas.
- La cobertura backend global debe crecer, especialmente en servicios heredados.
- Conviene dividir el chunk Dashboard mediante imports más granulares.
- Las imágenes reales deben ser curadas por contenido/licencia y servidas desde almacenamiento controlado.
- Falta un job E2E en GitHub Actions; la suite sí es reproducible con base aislada.
- Persiste una advertencia no bloqueante de Fast Refresh en `toast.tsx`.

## Matriz final

| Funcionalidad | Antes | Después | Tests | Estado |
| --- | --- | --- | --- | --- |
| Correo de activación | Plantilla básica | HTML SaaS + texto + URL central | Unitarios de plantilla/token | VERIFIED |
| Cambio de contraseña | Error genérico | Validación, transacción y revocación | Unit/integración | VERIFIED |
| Recuperación | Parcial para cliente | Personal + cliente, genérica y one-time | Unit/integración | VERIFIED |
| Login | Selector por actor | Endpoint e interfaz únicos | Unit/integración/E2E por roles | VERIFIED |
| Pagos | Registros aislados | Saldo y estados derivados | Unit/integración | VERIFIED |
| Asistencia | Salidas limitadas por hoy | Activos reales y PATCH atómico | Integración/E2E | VERIFIED |
| Notificaciones | Alcance amplio | Destino por cliente/usuario/rol | Integración/E2E | VERIFIED |
| Ejercicios | Tabla | Catálogo visual paginado | Unit/build/E2E/visual | VERIFIED |
| Rutinas | Cards básicas | Constructor ordenado y portal visual | Unit/integración/E2E | VERIFIED |
| Migraciones | Historia previa | Cinco migraciones nuevas con rollback | DB vacía + drift | VERIFIED |
| Envío real de email E2E | No automatizado | Simulado por outbox/token | Capas internas; sin proveedor externo | PARTIAL |
| E2E en CI | No configurado | Suite local reproducible 41/41 | Ejecución local aislada | PARTIAL |
