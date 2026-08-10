# BUGS_FUNCTIONAL_REVIEW.md

## Estado

Registro vivo de defectos funcionales y de seguridad encontrados durante el review.

| ID | Título | Severidad | Estado | Root cause | Test |
|---|---|---|---|---|---|
| FIX-001a | Flujos anónimos de acción (setup/reset/forgot-password) devuelven 403 CSRF_INVALIDO cuando el navegador conserva una cookie `fitmanager_refresh` obsoleta | ALTA | RESUELTO | El middleware CSRF exigía token si existe la cookie de refresh, aunque el endpoint sea anónimo y no tenga sesión | `csrf.middleware.test.ts` (8) + reproducción en vivo |
| FIX-001b | La rotación de refresh deja cookies obsoletas en el navegador | MEDIA | RESUELTO | `refresh()` lanzaba sin limpiar la cookie cuando el token es inválido/expirado | `auth.controller.test.ts` (2) |
| FIX-001c | El cliente no re-sincroniza el token CSRF tras un 403 por desync | MEDIA | RESUELTO | `http-client` no auto-recuperaba el token CSRF | `http-client.test.ts` (3) |
| ATT-001 | Dropdown de check-in de asistencias lista clientes no elegibles (inactivos, sin membresía vigente o con entrada abierta) | MEDIA | RESUELTO | El select de entrada reutilizaba `GET /clientes` (todos) en vez de clientes elegibles | `asistencia.repository.test.ts` (3) + `asistencia.service.test.ts` (1) + reproducción en vivo |
