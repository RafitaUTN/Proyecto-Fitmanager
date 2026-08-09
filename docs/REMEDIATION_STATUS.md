# Estado vivo de remediación de FitManager

Baseline: `main` @ `5a6570426bdc0cde1a465c3e43490888d8d668ae`  
Rama: `codex/fix/remediacion-integral-fitmanager`  
Inicio: 2026-08-09

Estados permitidos: `TODO`, `IN_PROGRESS`, `BLOCKED`, `FIXED`, `VERIFIED`.

| ID | Problema | Prioridad | Estado | Dependencias / orden | Commit | Test o evidencia |
|---|---|---:|---|---|---|---|
| SEC-001 | Data API con grants amplios y tablas sin RLS | P0 | IN_PROGRESS | 1 | — | catálogo Supabase + advisor |
| SEC-002 | IDOR en asignaciones y snapshots de rutinas | P0 | TODO | 2, contexto tenant | — | pendiente suite multi-tenant |
| SEC-003 | Asignación de rutina de otro gimnasio | P0 | TODO | 2 | — | pendiente test negativo |
| SEC-004 | Entrenador lista clientes no asignados | P0 | TODO | 2 | — | pendiente test por actor |
| SEC-005 | Transferencia conserva relaciones cross-tenant | P0 | TODO | 4, migración histórica | — | pendiente integración |
| BUG-001 | Renovación deja dos membresías activas | P0 | TODO | 3, DB-001 | — | pendiente concurrencia |
| DB-001 | Sin constraint de membresía activa única | P0 | TODO | 3, migraciones | — | pendiente PostgreSQL real |
| DEVOPS-001 | Migraciones no reproducibles y drift | P0 | TODO | 9 | — | migrate desde cero |
| BUG-004 | Operaciones de rutina escapan del `tx` | P1 | TODO | 5 | — | rollback forzado |
| BUG-005 | Transferencia mantiene entrenador/rutinas origen | P1 | TODO | 4 | — | integración cross-tenant |
| BUG-006 | Historia cambia de tenant al transferir | P1 | TODO | 4/6, schema | — | reportes históricos |
| BUG-007 | Check-in acepta membresía vencida | P1 | TODO | 6 | — | test de vigencia |
| BUG-002 | Refresh de cliente no persistido | P1 | TODO | 7, schema sesión | — | rotación/revocación |
| BUG-003 | Logout no revoca refresh | P1 | TODO | 7 | — | refresh revocado denegado |
| SEC-006 | Bearer tokens en localStorage y access de 8 h | P1 | TODO | 7, decisión de sesión | — | revisión CSP/XSS |
| SEC-007 | Usuario desactivado conserva acceso | P1 | TODO | 2/7, contexto actor | — | staff desactivado = 401 |
| SEC-008 | `main` sin protección y action no fijada | P1 | TODO | 12, CI verde | — | reglas GitHub |
| BUG-008 | Presentes incluye entradas antiguas abiertas | P2 | TODO | 6 | — | test día operativo |
| BUG-009 | Alertas duplicadas y conteo inconsistente | P2 | TODO | 8, constraint/event key | — | generación idempotente |
| BUG-010 | Correo duplicado al actualizar puede dar 500 | P2 | TODO | 2 | — | conflicto 409 |
| BUG-011 | Entrenador no ve rutina recién creada | P2 | TODO | 5, regla de propiedad | — | crear/listar entrenador |
| SEC-009 | `/auth/health` revela detalles internos | P2 | TODO | 11 | — | respuesta mínima |
| SEC-010 | Fórmula ejecutable en CSV | P2 | TODO | 11 | — | valores `=+-@` neutralizados |
| SEC-011 | Rate limit omite login cliente/refresh | P2 | TODO | 11 | — | configuración de rutas |
| SEC-012 | CSP permite `unsafe-inline` | P3 | TODO | 11/frontend | — | headers sin romper SPA |
| BUG-012 | Variable Vite no se inyecta al build Docker | P2 | TODO | 13 | — | smoke bundle sin localhost |
| DOC-001 | README/memoria contradicen implementación | P3 | TODO | 14, tras estabilizar | — | revisión documental |
| TEST-001 | Solo 3 unit tests y sin coverage | P1 | TODO | 10, después de P0 | — | unit/integration/coverage |
| TEST-002 | E2E puede apuntar a datos activos | P1 | TODO | 10 | — | guard `E2E_DATABASE_URL` |
| AUTH-001 | Recuperación de contraseña incompleta | P2 | TODO | 7/8 | — | token one-time y anti-enumeración |
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
- Una membresía `activo` será la única membresía activa por cliente; renovar cerrará la anterior y creará la nueva dentro de una única transacción.
