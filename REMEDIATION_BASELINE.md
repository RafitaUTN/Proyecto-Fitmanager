# FitManager — Baseline de remediación

Fecha: 2026-08-09 (America/Costa_Rica)

## Estado inicial

- Commit auditado: `f582120` (`docs: documentar evolución funcional y reglas de negocio`).
- Rama de origen: `codex/feature/mejoras-fitmanager-ux-negocio`.
- Rama de trabajo: `codex/fix/qa-remediation-production-readiness`.
- Diff productivo inicial: vacío.
- Cambios preexistentes preservados: informes y harness QA sin seguimiento.

## Backend

| Gate | Resultado inicial |
|---|---|
| Dependencias instaladas | PASS (`package-lock.json` vigente) |
| Prisma generate | PASS |
| Prisma validate | PASS |
| Build/TypeScript | PASS |
| Unit tests | 39/39 PASS |
| Integration PostgreSQL | 18/18 PASS |
| Coverage suite | 57/57 PASS |
| Coverage | 46,12% statements; 34,90% branches; 42,34% functions; 48,17% lines |
| npm audit | 0 vulnerabilidades |

## Frontend

| Gate | Resultado inicial |
|---|---|
| Dependencias instaladas | PASS (`package-lock.json` vigente) |
| Lint | PASS con warning Fast Refresh en `toast.tsx` |
| Build/TypeScript | PASS |
| Unit tests | 16/16 PASS |
| Coverage | 87,93% statements; 70,37% branches; 88% functions; 91,66% lines |
| Production bundle verifier | FAIL: endpoint `localhost:3000` incorporado |
| Bundle | `Dashboard` 619,22 kB minificado |
| npm audit | 0 vulnerabilidades |

## Base de datos

- PostgreSQL 17 aislado: `fitmanager_qa_e2e_20260809`.
- 13/13 migraciones aplicadas desde cero.
- `prisma migrate status`: up to date.
- `prisma migrate diff --exit-code`: sin drift.

## E2E y real-world

- Playwright Chromium: 41/41 PASS.
- Harness API/DB: 69 escenarios; 66 PASS y 3 FAIL.
- Verificaciones totales de auditoría: 207; 198 PASS, 8 FAIL, 1 BLOCKED.
- Performance corta: 890 requests, 0 errores, p95 máximo 58,97 ms.

## Defectos abiertos al inicio

`SEC-001`, `AUTH-001`, `PAY-001`, `TRANSFER-001`, `TRANSFER-002`, `REPORT-001`, `CONFIG-001`.

Este archivo registra el comportamiento anterior a la remediación; no implica que los defectos estén resueltos.
