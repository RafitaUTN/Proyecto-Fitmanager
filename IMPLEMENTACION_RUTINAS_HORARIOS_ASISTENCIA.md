# Implementación de rutinas, horarios y asistencia — FitManager

Fecha de cierre local: 27/08/2026.

## A. Error reset password

### Causa raíz

La URL pública usada para correos reutilizaba una variable pensada para CORS. En producción `FRONTEND_URL` podía contener varios orígenes separados por coma, por ejemplo:

```text
https://fitmanager-saas.vercel.app,https://frontend-progra2.vercel.app
```

Al concatenar esa cadena con `/reset-password?token=...`, el correo terminaba generando una URL inválida.

### Solución

Se separaron responsabilidades:

- `PUBLIC_APP_URL`: URL canónica única para correos y acciones públicas.
- `FRONTEND_URLS`: lista de orígenes permitidos para CORS.

El sistema permite alternar entre Gmail/Nodemailer (valor por defecto, `ACTIVE_EMAIL_PROVIDER=gmail`) y Resend (`ACTIVE_EMAIL_PROVIDER=resend`), un proveedor transaccional para Vercel que expone `RESEND_API_KEY` solo en el entorno de deployment.

Archivos principales:

- `backend/src/config/public-url.ts`
- `backend/src/config/env.ts`
- `backend/src/config/cors.ts`
- `backend/src/email/email.service.ts`
- `backend/src/email/providers/resend.provider.ts`
- `.github/workflows/deploy.yml`
- `.env.example`
- `backend/.env.example`
- `docker-compose.yml`

Pruebas ejecutadas:

```bash
npm --prefix backend test -- public-url cors email-templates
```

Resultado: 18/18 pruebas aprobadas.

## B. Arquitectura

La solución mantiene el flujo de arquitectura existente:

```text
React
→ TanStack Query / hooks
→ HTTP Client
→ Express Routes
→ Auth / RBAC / CSRF
→ Controllers
→ DTO / Zod
→ Services
→ Repositories / Prisma
→ PostgreSQL
```

No se agregó acceso directo desde el frontend hacia PostgreSQL ni Supabase. Toda la lógica nueva pasa por backend, validación Zod, servicios, repositorios y Prisma.

## C. Rutinas

Se preservaron las rutinas flexibles existentes:

```text
Rutina
→ Asignación directa al cliente
→ Portal Cliente / Mis Rutinas
```

Además se agregó la modalidad programada:

```text
Rutina
→ Programación / sesión
→ Fecha, hora, entrenador, niveles y clientes
→ Cliente visualiza calendario
→ Cliente marca completada
```

Las rutinas actuales siguen funcionando; no fueron reemplazadas.

## D. Horarios

Se agregó el módulo de horarios para Administrador y Entrenador:

- crear sesión programada;
- seleccionar rutina;
- asignar entrenador;
- definir fecha;
- definir hora inicio y fin;
- asignar nivel;
- asignar clientes específicos;
- capacidad opcional;
- notas opcionales;
- cancelar sesión.

La validación de conflictos vive en backend usando la regla:

```text
nuevoInicio < existenteFin
AND
nuevoFin > existenteInicio
```

Se validan conflictos de:

- entrenador;
- clientes asignados;
- gimnasio actual (`id_gimnasio`);
- edición de sesión existente.

Las sesiones consecutivas sí son válidas, por ejemplo 18:00-19:00 y 19:00-20:00.

## E. Asistencia

Se mantiene la asistencia manual para Administrador y Recepcionista.

Se agregó autoservicio para Cliente:

- ver asistencia actual;
- registrar entrada propia;
- registrar salida propia;
- fuente de asistencia (`STAFF`, `CLIENTE`, `AUTOMATICA`).

El frontend del portal cliente incluye un botón flotante discreto para entrada/salida.

El panel de Asistencias del staff ahora muestra:

- clientes actualmente dentro del gimnasio;
- duración en gimnasio;
- fuente de entrada;
- rutina programada actual/próxima del día;
- entrenador asociado;
- acción para registrar salida.

## F. Multi-tenant

La protección multi-tenant se mantiene en:

- filtros por `id_gimnasio` en servicios y repositorios;
- validación de rutina, entrenador, cliente y sesión dentro del gimnasio autenticado;
- endpoints de cliente que derivan identidad desde `req.usuario` / contexto autenticado;
- rechazo de recursos de otros gimnasios con errores 403/404 según corresponda.

El cliente nunca envía libremente `id_cliente` ni `id_gimnasio` para autoservicio.

## G. RBAC

| Actor | Permisos nuevos |
| --- | --- |
| Administrador | Crear, listar, editar y cancelar horarios de rutinas del gimnasio. |
| Entrenador | Crear/listar/cancelar horarios propios según reglas del backend. |
| Recepcionista | Conserva asistencia manual; no administra rutinas programadas. |
| Cliente | Ver calendario, completar sesiones propias o por nivel, registrar entrada y salida propias. |

## H. Endpoints

### Staff

| Método | Ruta | Roles |
| --- | --- | --- |
| GET | `/api/programaciones-rutinas` | Administrador, Entrenador |
| POST | `/api/programaciones-rutinas` | Administrador, Entrenador |
| PATCH | `/api/programaciones-rutinas/:id` | Administrador, Entrenador |
| POST | `/api/programaciones-rutinas/:id/cancelar` | Administrador, Entrenador |

### Cliente

| Método | Ruta | Rol |
| --- | --- | --- |
| GET | `/api/cliente/me/rutinas/calendario` | Cliente |
| PATCH | `/api/cliente/me/rutinas/programadas/:id/completar` | Cliente |
| GET | `/api/cliente/me/asistencia/actual` | Cliente |
| POST | `/api/cliente/me/asistencia/entrada` | Cliente |
| POST | `/api/cliente/me/asistencia/salida` | Cliente |

## I. Migraciones

Migración nueva:

```text
backend/prisma/migrations/20260827010000_programacion_rutinas_asistencia_cliente/migration.sql
```

Cambios principales:

- enum `NivelCliente`;
- enum `NivelSesionRutina`;
- enum `EstadoSesionRutina`;
- enum `OrigenAsistencia`;
- campo `cliente.nivel`;
- campo `asistencia.origen`;
- tabla `programacion_rutina`;
- tabla `programacion_rutina_cliente`;
- tabla `programacion_rutina_nivel`;
- índices por gimnasio, fecha, entrenador, estado y cliente;
- constraints de rango horario y capacidad positiva.

Validación Docker:

```bash
docker compose exec -T backend npx prisma migrate status
```

Resultado: base de datos actualizada y 24 migraciones aplicadas.

## J. Tests

Validaciones ejecutadas:

```bash
npm --prefix backend run build
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend test
$env:VITE_API_URL='https://fitmanager-backend-nine.vercel.app/api'; npm --prefix frontend run build
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose exec -T backend npx prisma migrate status
```

Resultados:

- Backend build: aprobado.
- Backend tests: 36 archivos, 328 pruebas aprobadas.
- Frontend lint: aprobado.
- Frontend tests: 10 archivos, 48 pruebas aprobadas.
- Frontend build producción: aprobado.
- Docker backend: healthy.
- Docker frontend: healthy.
- PostgreSQL Docker: healthy.
- Prisma migrate status dentro de Docker: up to date.

## K. Frontend

Archivos principales:

- `frontend/src/pages/ProgramacionRutinas.tsx`
- `frontend/src/hooks/use-programaciones-rutinas.ts`
- `frontend/src/pages/ClienteRutinas.tsx`
- `frontend/src/pages/ClienteLayout.tsx`
- `frontend/src/pages/Asistencias.tsx`
- `frontend/src/hooks/use-cliente-portal.ts`
- `frontend/src/hooks/use-asistencias.ts`
- `frontend/src/lib/query-keys.ts`
- `frontend/src/pages/Dashboard.tsx`

Se agregaron:

- vista semanal/lista para cliente;
- progreso semanal real;
- estado completada/pendiente;
- botón de completar rutina;
- botón flotante de asistencia;
- módulo staff para horarios;
- query keys con filtros/rangos;
- invalidaciones focalizadas de TanStack Query.

## L. Rendimiento

Medidas aplicadas:

- consultas por rango de fechas, no carga histórica completa;
- paginación en endpoint staff de programaciones;
- índices por `id_gimnasio`, fecha, entrenador, estado y cliente;
- `staleTime` y `refetchInterval` moderados en asistencia activa;
- invalidación puntual en vez de refrescar toda la aplicación.

No se introdujeron WebSockets obligatorios. Se conserva TanStack Query como estrategia principal.

## M. Seguridad

Se mantienen:

- JWT;
- refresh tokens;
- cookies HttpOnly;
- CSRF;
- CORS separado por `FRONTEND_URLS`;
- Helmet;
- rate limiting;
- RBAC;
- validaciones Zod;
- transacciones Prisma;
- aislamiento por tenant.

La recuperación de contraseña no imprime tokens en logs, no envía contraseñas por correo y usa URL pública canónica.

## N. Compatibilidad móvil

El portal del cliente mantiene compatibilidad web y Capacitor/Android:

- el calendario en móvil prioriza vista lista/timeline;
- el botón flotante evita bloquear navegación principal;
- las acciones tienen etiquetas visibles;
- la UI conserva colores e identidad visual de FitManager.

## Decisiones adaptadas

### Propuesta original

Crear un sistema completo de sesiones, ejecución, horarios y asistencia.

### Riesgo encontrado

FitManager ya tenía rutinas flexibles y asignaciones directas funcionales. Reemplazarlas habría roto compatibilidad con clientes existentes.

### Solución implementada

Se agregó `ProgramacionRutina` como capa nueva encima de `Rutina`, manteniendo intactas las asignaciones existentes.

### Por qué es más segura

Permite crecer hacia calendario y sesiones sin migrar ni eliminar datos previos, preservando la lógica de negocio actual.

