# QA_FUNCTIONAL_REVIEW.md

Ciclo de correcciones funcionales y QA exploratorio.

## Estado inicial

- Rama: `codex/fix/qa-remediation-production-readiness`
- Árbol limpio salvo `OPENCODE_HANDOFF_ANALYSIS.md` (sin seguimiento, ajeno)

## Problemas reportados

| ID | Título | Estado |
|---|---|---|
| FIX-001 | Activación de cliente devuelve "Token CSRF inválido" | RESUELTO (tests: backend 10 nuevos, frontend 3 nuevos) |
| NAV-001 | "Reportes" aparece redundante en el sidebar | PENDIENTE |
| ATT-001 | Dropdown de check-in lista clientes no elegibles | PENDIENTE |
| TRANSFER-UX-001 | Botón "Solicitar transferencia" desapareció | PENDIENTE |
| EXERCISE-UX-001 | Media de ejercicios debe venir de API externa buscable (sin emojis/URLs manuales) | PENDIENTE |

## Hallazgos adicionales

(A completar durante el QA exploratorio)

## Resolución FIX-001 (activación "Token CSRF inválido")

Reproducción confirmada contra el stack en vivo:
1. Navegador con cookie `fitmanager_refresh` obsoleta (máquina compartida / sesión antigua).
2. `POST /api/auth/refresh` falla con 401/403 → el store anula el token CSRF en memoria.
3. `POST /api/auth/setup-password` se envía sin cabecera `X-CSRF-Token` pero con la cookie de refresh aún en el navegador → el middleware CSRF global exigía doble envío y devolvía `403 CSRF_INVALIDO` ANTES de validar el token de acción.

Correcciones:
- `backend/src/middlewares/csrf.middleware.ts` (nuevo): extrae el middleware global y exime únicamente las rutas anónimas de acción por token (`setup-password`, `reset-password`, `forgot-password`) y el registro público (`/api/gimnasios`). Justificación: sin sesión no hay nada que un CSRF pueda "cabalgar"; el POST solo tiene efecto conociendo el token de un solo uso.
- `backend/src/controllers/auth.controller.ts`: en `refresh`, si el token es inválido/expirado (REFRESH_INVALIDO/REFRESH_EXPIRADO/SESION_COMPROMETIDA) se limpian las cookies obsoletas.
- `frontend/src/lib/http-client.ts`: auto-recuperación CSRF — ante `403 CSRF_INVALIDO` re-sincroniza `GET /auth/csrf` y reintenta una sola vez.

Verificación: 5/5 checks del script de reproducción en vivo; suite backend 292 tests (+10), suite frontend 40 tests (+3).
