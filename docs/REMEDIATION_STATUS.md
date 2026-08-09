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
| SEC-005 | Transferencia conserva relaciones cross-tenant | P0 | VERIFIED | 4, migración histórica | pendiente commit | integración PostgreSQL real 2/2 |
| BUG-001 | Renovación deja dos membresías activas | P0 | VERIFIED | 3, DB-001 | `0fd03c6` | concurrencia PostgreSQL real 2/2 |
| DB-001 | Sin constraint de membresía activa única | P0 | VERIFIED | 3, migraciones | `0fd03c6` | índice parcial y check verificados en producción |
| DEVOPS-001 | Migraciones no reproducibles y drift | P0 | TODO | 9 | — | migrate desde cero |
| BUG-004 | Operaciones de rutina escapan del `tx` | P1 | FIXED | 5 | `3adb0ad` | todas las escrituras reciben `tx` |
| BUG-005 | Transferencia mantiene entrenador/rutinas origen | P1 | VERIFIED | 4 | pendiente commit | integración: entrenador nulo y rutina archivada |
| BUG-006 | Historia cambia de tenant al transferir | P1 | VERIFIED | 4/6, schema | pendiente commit | pago/asistencia conservan tenant origen |
| BUG-007 | Check-in acepta membresía vencida | P1 | FIXED | 6 | pendiente commit | servicio valida rango de vigencia en transacción |
| BUG-002 | Refresh de cliente no persistido | P1 | VERIFIED | 7, schema sesión | pendiente commit | persistencia/rotación PostgreSQL real |
| BUG-003 | Logout no revoca refresh | P1 | VERIFIED | 7 | pendiente commit | refresh revocado denegado |
| SEC-006 | Bearer tokens en localStorage y access de 8 h | P1 | FIXED | 7, decisión de sesión | pendiente commit | access 15 min, iss/aud/jti; CSP pendiente |
| SEC-007 | Usuario desactivado conserva acceso | P1 | FIXED | 2/7, contexto actor | `3adb0ad` | middleware resuelve actor activo; unit test 401 |
| SEC-008 | `main` sin protección y action no fijada | P1 | TODO | 12, CI verde | — | reglas GitHub |
| BUG-008 | Presentes incluye entradas antiguas abiertas | P2 | FIXED | 6 | pendiente commit | consultas limitadas a jornada local actual |
| BUG-009 | Alertas duplicadas y conteo inconsistente | P2 | TODO | 8, constraint/event key | — | generación idempotente |
| BUG-010 | Correo duplicado al actualizar puede dar 500 | P2 | TODO | 2 | — | conflicto 409 |
| BUG-011 | Entrenador no ve rutina recién creada | P2 | FIXED | 5, regla de propiedad | `3adb0ad` | creador entrenador se autoasigna |
| SEC-009 | `/auth/health` revela detalles internos | P2 | FIXED | 11 | pendiente commit | respuesta limitada a `{status}` |
| SEC-010 | Fórmula ejecutable en CSV | P2 | TODO | 11 | — | valores `=+-@` neutralizados |
| SEC-011 | Rate limit omite login cliente/refresh | P2 | FIXED | 11 | pendiente commit | login cliente/refresh/recovery limitados |
| SEC-012 | CSP permite `unsafe-inline` | P3 | TODO | 11/frontend | — | headers sin romper SPA |
| BUG-012 | Variable Vite no se inyecta al build Docker | P2 | TODO | 13 | — | smoke bundle sin localhost |
| DOC-001 | README/memoria contradicen implementación | P3 | TODO | 14, tras estabilizar | — | revisión documental |
| TEST-001 | Solo 3 unit tests y sin coverage | P1 | TODO | 10, después de P0 | — | unit/integration/coverage |
| TEST-002 | E2E puede apuntar a datos activos | P1 | TODO | 10 | — | guard `E2E_DATABASE_URL` |
| AUTH-001 | Recuperación de contraseña incompleta | P2 | VERIFIED | 7/8 | pendiente commit | one-time, expiración, anti-enumeración, revocación |
| MAIL-001 | Métodos de correo no implementados/sin retry | P3 | TODO | 8 | — | provider + outbox mínimo |
| API-001 | Sin OpenAPI | P3 | TODO | 14 | — | validación del documento |
| OBS-001 | Sin logging estructurado/request id | P3 | TODO | 11 | — | logs sanitizados |
| DEP-001 | Advisories npm high/moderate | P2 | TODO | 11, actualizaciones incrementales | — | `npm audit` + regresión |
| DB-002 | BigInt se serializa como Number | P2 | TODO | contrato API/frontend | — | IDs grandes sin pérdida |

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
- Sesiones: 13/13 unitarias y 7/7 integraciones; rotación/revocación staff-cliente y recuperación one-time verificadas. Se mantiene Bearer temporalmente para evitar una migración parcial a cookies entre orígenes; el endurecimiento CSP queda en SEC-012.
