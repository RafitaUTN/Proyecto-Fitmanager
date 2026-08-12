# Estado vivo de remediación de FitManager

Baseline: `main` @ `5a6570426bdc0cde1a465c3e43490888d8d668ae`  
Rama: `codex/fix/remediacion-integral-fitmanager`  
Inicio: 2026-08-09

Estados permitidos: `TODO`, `IN_PROGRESS`, `BLOCKED`, `FIXED`, `VERIFIED`.

| ID | Problema | Prioridad | Estado | Dependencias / orden | Commit | Test o evidencia |
|---|---|---:|---|---|---|---|
| SEC-001 | Data API con grants amplios y tablas sin RLS | P0 | VERIFIED | 1 | `10e4085` | 19/19 RLS; grants Data API falsos; health 200 |
| SEC-002 | IDOR en asignaciones y snapshots de rutinas | P0 | FIXED | 2, contexto tenant | `3adb0ad` | predicados tenant + unit tests |
| SEC-003 | Asignación de rutina de otro gimnasio | P0 | FIXED | 2 | `3adb0ad` | test negativo cross-tenant |
| SEC-004 | Entrenador lista clientes no asignados | P0 | FIXED | 2 | `3adb0ad` | controller fuerza actor autenticado |
| SEC-005 | Transferencia conserva relaciones cross-tenant | P0 | VERIFIED | 4, migración histórica | `6c9e9b5` | integración PostgreSQL real 2/2 |
| BUG-001 | Renovación deja dos membresías activas | P0 | VERIFIED | 3, DB-001 | `0fd03c6` | concurrencia PostgreSQL real 2/2 |
| DB-001 | Sin constraint de membresía activa única | P0 | VERIFIED | 3, migraciones | `0fd03c6` | índice parcial y check verificados en producción |
| DEVOPS-001 | Migraciones no reproducibles y drift | P0 | VERIFIED | 9 | `83ed1cf` | base vacía + deploy + diff = PASS |
| BUG-004 | Operaciones de rutina escapan del `tx` | P1 | FIXED | 5 | `3adb0ad` | todas las escrituras reciben `tx` |
| BUG-005 | Transferencia mantiene entrenador/rutinas origen | P1 | VERIFIED | 4 | `6c9e9b5` | integración: entrenador nulo y rutina archivada |
| BUG-006 | Historia cambia de tenant al transferir | P1 | VERIFIED | 4/6, schema | `6c9e9b5` | pago/asistencia conservan tenant origen |
| BUG-007 | Check-in acepta membresía vencida | P1 | VERIFIED | 6 | `6c9e9b5` | servicio valida rango de vigencia en transacción |
| BUG-002 | Refresh de cliente no persistido | P1 | VERIFIED | 7, schema sesión | `a5fc9d6` | persistencia/rotación PostgreSQL real |
| BUG-003 | Logout no revoca refresh | P1 | VERIFIED | 7 | `a5fc9d6` | refresh revocado denegado |
| SEC-006 | Bearer tokens en localStorage y access de 8 h | P1 | VERIFIED | 7, decisión de sesión | `ab7b6ec` | access 15 min en memoria + refresh HttpOnly rotatorio + doble envío CSRF |
| SEC-007 | Usuario desactivado conserva acceso | P1 | FIXED | 2/7, contexto actor | `3adb0ad` | middleware resuelve actor activo; unit test 401 |
| SEC-008 | `main` sin protección y action no fijada | P1 | VERIFIED | 12, CI verde | `570fd93` | main/develop: PR + 1 aprobación + 3 checks + historial lineal |
| BUG-008 | Presentes incluye entradas antiguas abiertas | P2 | VERIFIED | 6 | `6c9e9b5` | consultas limitadas a jornada local actual |
| BUG-009 | Alertas duplicadas y conteo inconsistente | P2 | VERIFIED | 8, constraint/event key | `40fe684` | integración: segunda generación crea 0 |
| BUG-010 | Correo duplicado al actualizar puede dar 500 | P2 | VERIFIED | 2 | `da5e73e` | precheck cliente/usuario + `P2002` global a 409 |
| BUG-011 | Entrenador no ve rutina recién creada | P2 | FIXED | 5, regla de propiedad | `3adb0ad` | creador entrenador se autoasigna |
| SEC-009 | `/auth/health` revela detalles internos | P2 | VERIFIED | 11 | `a5fc9d6` | respuesta limitada a `{status}` |
| SEC-010 | Fórmula ejecutable en CSV | P2 | VERIFIED | 11 | `da5e73e` | valores `=+-@`, tab y CR neutralizados; tests |
| SEC-011 | Rate limit omite login cliente/refresh | P2 | VERIFIED | 11 | `a5fc9d6` | login cliente/refresh/recovery limitados |
| SEC-012 | CSP permite `unsafe-inline` | P3 | VERIFIED | 11/frontend | `da5e73e` | `script-src 'self'`, object/base/frame restringidos; build SPA PASS |
| BUG-012 | Variable Vite no se inyecta al build Docker | P2 | VERIFIED | 13 | `570fd93` | ARG/ENV build-time + smoke bundle + imagen Docker PASS |
| DOC-001 | README/memoria contradicen implementación | P3 | VERIFIED | 14, tras estabilizar | `50d2b28` (drift) | README y AGENTS actualizados; AGENTS.md es gitignored (vivo, no commiteable) |
| TEST-001 | Solo 3 unit tests y sin coverage | P1 | VERIFIED | 10, después de P0 | `b811147` | 38 backend + 14 frontend; umbrales de cobertura |
| TEST-002 | E2E puede apuntar a datos activos | P1 | VERIFIED | 10 | `b811147` | guard local `E2E_DATABASE_URL` + seed dedicado |
| AUTH-001 | Recuperación de contraseña incompleta | P2 | VERIFIED | 7/8 | `a5fc9d6` | one-time, expiración, anti-enumeración, revocación |
| MAIL-001 | Métodos de correo no implementados/sin retry | P3 | VERIFIED | 8 | `40fe684` | outbox, 3 intentos, estado y reenvío admin |
| API-001 | Sin OpenAPI | P3 | VERIFIED | 14 | `50d2b28` | OpenAPI en docs + contrato 74/74 endpoints y 16 refs resueltos |
| OBS-001 | Sin logging estructurado/request id | P3 | VERIFIED | 11 | `da5e73e` | JSON por request, correlación y ruta sin query |
| DEP-001 | Advisories npm high/moderate | P2 | VERIFIED | 11, actualizaciones incrementales | `da5e73e` | backend/frontend `npm audit`: 0; regresión PASS |
| DB-002 | BigInt se serializa como Number | P2 | VERIFIED | contrato API/frontend | `da5e73e` | Number solo en rango seguro; string fuera; unit tests |

## Baseline verificable

| Comprobación | Resultado inicial |
|---|---|
| Backend build | PASS |
| Backend unit tests | PASS — 3/3 |
| Prisma validate | PASS |
| Prisma generate | PASS |
| Frontend build | PASS — warning de chunk >500 kB |
| Frontend lint | PASS — una advertencia Fast Refresh |
| Frontend unit tests | NO DISPONIBLES |
| Backend npm audit | FAIL — 4 high, 7 moderate |
| Frontend npm audit | FAIL — 3 high, 1 moderate |

## Decisiones de diseño propuestas

- La aplicación no usa Supabase Auth ni Data API: el acceso público será revocado y RLS quedará `deny-by-default`. El backend seguirá por conexión PostgreSQL directa hasta aprovisionar un rol de aplicación con credenciales administradas.
- Los recursos tenant-sensitive se resolverán mediante contexto de actor autenticado y consultas `id + id_gimnasio`; un recurso de otro tenant responderá 404 para no facilitar enumeración.
- Al transferir, pagos y asistencias conservarán el gimnasio donde ocurrió el evento. Entrenador y rutinas activas del origen se desvincularán/cerrarán.
- Una membresía `activo` será la única membresía activa por cliente; renovar extenderá el mismo contrato bajo bloqueo de fila y una única transacción.

## Evidencia acumulada

- Migración `preserve_historical_tenant` aplicada en Supabase tras prechecks sin duplicados ni filas huérfanas; postcheck: 2 columnas tenant `NOT NULL`, 2 índices parciales y 0 hechos sin tenant.
- Suite actual: 13/13 pruebas unitarias y 4/4 pruebas de integración PostgreSQL real; build TypeScript/Prisma en verde.
- Sesiones: access JWT solo en memoria, refresh rotatorio exclusivamente en cookie HttpOnly y CSRF de doble envío para renovar/cerrar; la recarga restaura identidad desde servidor y elimina residuos legacy de localStorage.
- Notificaciones: `event_key` único, destinatario obligatorio y conteo/listado de entrenador alineados. Outbox de correo persistente con estado, retry y reenvío manual; métodos públicos ficticios eliminados.
- Migraciones: baseline nuevo + 7 migraciones reproducibles en PostgreSQL 17 vacío. `prisma migrate deploy`, `validate` y `migrate diff --exit-code` pasan. Producción y reconstrucción coinciden exactamente: 169 columnas (`8fec360f…`), 86 índices (`584716bc…`) y 60 constraints (`74e4ac75…`). El historial legado se conserva fuera de la ruta activa y la reconciliación de `_prisma_migrations` tiene rollback explícito.
- Pruebas: backend 28/28 (13 unitarias + 15 integraciones PostgreSQL real), cobertura crítica 43.15% statements/30.89% branches/36.79% functions/45.04% lines; frontend 14/14 y 80.16%/61.53%/85.71%/82.24%. La matriz negativa multi-tenant cubre clientes, membresías, rutinas, ejercicios, asistencias y notificaciones.
- PR #34 revisado sin incorporar en bloque: sus mocks dependen de contratos anteriores y omiten varias transacciones reales. Se conservaron los escenarios útiles (anti-enumeración, refresh, autorización asimétrica y matriz tenant), reimplementados contra PostgreSQL real.
- Endurecimiento de borde: CSV neutraliza fórmulas, CSP elimina scripts inline, `P2002` se traduce a 409, BigInt conserva precisión y los logs HTTP estructurados incluyen `x-request-id` sin query strings ni credenciales. Ambos árboles npm reportan 0 vulnerabilidades high/moderate (y 0 totales al cierre de esta fase).
- CI/CD: jobs separados de backend/frontend con PostgreSQL 17, migración desde cero, drift, coverage, audits, build y smoke de bundle; CodeQL semanal/PR. Todas las actions están fijadas por SHA. Deploy de producción solo se dispara tras CI verde. OpenCode queda deshabilitado por defecto mediante `OPENCODE_ENABLED` hasta aprovisionar su secret.
- Docker: backend ejecuta `prisma migrate deploy` (nunca `db push`) y el seed es opt-in; las imágenes de producción backend/frontend construyen correctamente. Smoke real del contenedor backend: migraciones sin pendientes, DB conectada y `/api/health` 200 con log correlacionado.
- GitHub: `main` y `develop` protegidas remotamente con rama actualizada antes de merge, una aprobación, conversaciones resueltas, historial lineal, aplicación a administradores y checks obligatorios de Backend, Frontend y CodeQL; force-push y borrado deshabilitados.
- PR #35: Backend, Frontend, CodeQL y preview Vercel completaron con éxito; el merge permanece bloqueado correctamente a la espera de una aprobación.
- Preview aislado: recurso Neon `fitmanager-preview-free` en plan `free_v3`, conectado solamente al entorno Preview del backend en Vercel. Las 8 migraciones se aplicaron sin drift; contiene 21 tablas de aplicación y 0 filas iniciales. Preview usa secretos JWT propios y `EMAIL_DELIVERY_ENABLED=false`, sin modificar Producción ni generar cargos.

## Auditoría de producción — QA complementaria (2026-08-10)

Rama: `codex/fix/qa-remediation-production-readiness` (fases 12–20)

| ID | Hallazgo | Severidad | Estado | Commit | Test o evidencia |
|---|---:|---|---:|---|---|
| QA-001 | `app.set('trust proxy', 1)` incondicional permite spoofear `X-Forwarded-For` y saltarse el rate limiter en despliegues sin reverse proxy | P2 | FIXED | `71dd07d` | `env.trustProxy` configurable (`TRUST_PROXY`), `parseTrustProxy` con 7 tests |
| QA-002 | `download.ts` sin manejo de errores/refresh y `ExportModal` sin estado deshabilitado | P3 | FIXED | `cfa2c65` | unit tests de descarga/exportación |
| QA-003 | `QueryClient` no singleton y caché sin limpiar al cambiar de sesión | P3 | FIXED | `79d5ce5` | query-client único + invalidation al login/logout |
| QA-004 | `GET /api/ejercicios/media/buscar` ausente en OpenAPI (drift de contrato) | P3 | FIXED | `50d2b28` | comparación 74/74 paths, 16 refs resueltos |
| QA-005 | Drift de documentación: `login-cliente`, `generar-acceso`, `loginCliente()` referenciados pese a login unificado | P3 | FIXED | — (AGENTS.md gitignored) | AGENTS.md alineado con `POST /api/auth/login` + `IDENTIDAD_AMBIGUA` + setup/recuperación |
| QA-006 | E2E apuntando a datos activos / sin verificación aislada | P1 | VERIFIED | — | Playwright 41/41 contra BD `fitmanager_e2e` (backend local :3000, `E2E_API_URL` corregido) |
| QA-007 | Advisories en dependencias | P2 | VERIFIED | — | backend y frontend `npm audit`: 0 vulnerabilidades |
| QA-008 | Integridad transaccional en asignación de rutinas y capacidad de entrenadores | P2 | VERIFIED | — | validaciones y escrituras dentro de `tx`; sin TOCTOU residual |

**Estado global de producción:** 8 hallazgos (1 P2 fijo, 3 P3 fijos, 4 verificados sin riesgo). Sin hallazgos P0/P1 pendientes. Backend: 282 tests unit/integration verdes + `tsc --noEmit` limpio. E2E: 41/41. `npm audit`: 0/0. Contrato API 74/74.
