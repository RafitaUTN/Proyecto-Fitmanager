# FitManager — Memoria del Proyecto

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 + TypeScript 6 + TailwindCSS v4 + Shadcn |
| Backend | Node 22 + Express + TypeScript |
| ORM | Prisma v7 (driver `@prisma/adapter-pg`) |
| BD | PostgreSQL 17 |
| Auth | JWT + bcrypt + refresh tokens |
| Frontend libs | React Router, TanStack Query, Zustand, React Hook Form, Zod, Framer Motion, Lucide React |

## Arquitectura

Backend en capas con separación multi-tenant (cada gimnasio ve solo sus datos):

```
src/
  controllers/   - Manejan request/response
  services/      - Lógica de negocio
  repositories/  - Acceso a BD vía Prisma
  routes/        - Definición de rutas Express
  dtos/          - Schemas Zod de validación
  middlewares/   - Auth middleware (JWT)
  lib/           - Prisma client, JWT utils, env
  config/        - Configuración de entorno
  types/         - Declaraciones de tipos globales
```

Base de datos: `prisma/schema.prisma` con 12 modelos.
Seed: `prisma/seed.ts` — datos de prueba (gimnasio, admin, clientes, membresías, ejercicios).

## Estado Actual

### Sprint 1 — Completo ✅

| HU | Descripción | Archivos clave |
|----|-------------|----------------|
| HU-01 | Registro de gimnasio + admin | `gimnasio.controller.ts`, `gimnasio.service.ts`, `RegistroGimnasio.tsx` |
| HU-02 | Login JWT + refresh token | `auth.controller.ts`, `auth.service.ts`, `Login.tsx`, `auth.store.ts` |
| HU-03 | CRUD usuarios + roles | `usuario.controller.ts`, `Usuarios.tsx` |
| HU-04 | CRUD clientes | `cliente.controller.ts`, `Clientes.tsx` |

### Sprint 2 — Completo ✅

| HU | Descripción | Archivos clave |
|----|-------------|----------------|
| HU-05 | CRUD planes membresía | `membresia.controller.ts`, `Membresias.tsx` |
| HU-06 | Asignar/renovar/cancelar membresías | `cliente-membresia.controller.ts`, `AsignarMembresia.tsx` |
| HU-07 | Consultar estado membresía | `EstadoMembresia.tsx`, endpoint `/:id/estado` |
| HU-08 | Alertas de vencimiento | `notificacion.controller.ts`, `Alertas.tsx` |
| HU-09 | Pagos manuales | `pago.controller.ts`, `Pagos.tsx` |

### Sprint 2.5 — Completo ✅

| Mejora | Descripción | Archivos |
|--------|-------------|----------|
| Registro rediseñado | Logo minimalista fuera de tarjeta, sin nav duplicado, layout compacto 2 columnas sin scroll | `RegistroGimnasio.tsx` |
| Sidebar responsive | Drawer con hamburger en mobile (<1024px), overlay backdrop, cierra al navegar | `Dashboard.tsx` |
| Tablas responsive | `overflow-x-auto` en contenedores de tabla para scroll horizontal en mobile | `Usuarios.tsx`, `Clientes.tsx`, `Pagos.tsx`, `AsignarMembresia.tsx` |
| Grids responsive | Formularios con `grid-cols-1 sm:grid-cols-2/3` para stacking en mobile | `Usuarios.tsx`, `Clientes.tsx`, `Pagos.tsx`, `AsignarMembresia.tsx` |
| Header responsive | Padding del contenido principal varía de `p-4 pt-16` (mobile) a `p-8` (desktop) | `Dashboard.tsx` |
| Sidebar filtrado por rol | Items de menú visibles según `usuario.rol` | `Dashboard.tsx` |
| Fase 1: Refresh token | Endpoint `POST /api/auth/refresh`, modelo `RefreshToken`, store con refresh | `auth.repository.ts`, `auth.controller.ts`, `auth.store.ts`, `schema.prisma` |
| Fase 2: DELETE endpoints | Eliminar usuarios, clientes y membresías con confirmación | `usuario.*.ts`, `cliente.*.ts`, `membresia.*.ts`, `Usuarios.tsx`, `Clientes.tsx`, `Membresias.tsx` |
| Fase 3-4: Sidebar | Enlaces Asignar/Estado Membresía + filtrado por rol | `Dashboard.tsx` |
| Rate limiter | Aumentado a 10000 en desarrollo (`app.ts`) | `app.ts` |
| Partial unique index | `idx_cliente_membresia_activa` evita duplicados activos por cliente | `schema.prisma`, migración manual |

### Landing Page — Completo ✅

| Sección | Descripción | Archivos |
|---------|-------------|----------|
| Navbar | Sticky con blur, logo oficial, nav links, auth buttons, menú mobile | `Landing.tsx` |
| Hero | Headline con "GIMNASIO" en naranja, badge animado, CTAs, stats inline | `Landing.tsx` |
| Mockup Dashboard | Sidebar, KPIs, gráfica animada, tabla clientes — basado en UI real | `Landing.tsx` |
| Beneficios | 4 glass-effect premium cards con iconos Lucide + "Conocer más" | `Landing.tsx` |
| Módulos | 6 cards con Lucide icons + arrow indicator + hover naranja | `Landing.tsx` |
| Vista previa | 3 cards tipo navegador con esqueleto de interfaz | `Landing.tsx` |
| Why Choose | 4 cards nuevas (Shield, Sparkles, LineChart, Globe) | `Landing.tsx` |
| FAQ | Acordeón con Framer Motion AnimatePresence | `Landing.tsx` |
| Métricas | Stats con AnimatedCounter + iconos Lucide + hover cards | `Landing.tsx` |
| CTA Final | Gradiente naranja/verde, headline, dos CTAs | `Landing.tsx` |
| Footer | Logo, 4 columnas + redes sociales (iconos Lucide) | `Landing.tsx` |
| Animaciones | Framer Motion: fadeUp, useInView, whileHover, AnimatePresence | `Landing.tsx` |
| Background | Glows naranja/green, ruido SVG, grid 60px | `Landing.tsx` |

### Sprint 3 — Pendiente
- HU-10: Consulta historial pagos
- HU-11: Registro/validación asistencia
- HU-12: Historial asistencia
- HU-13: Gestión rutinas

### Sprint 4 — Pendiente
- HU-14: Portal cliente
- HU-15: Reportes administrativos
- HU-16: Exportación reportes
- HU-17: Dashboard indicadores
- HU-18: Separación datos multi-tenant

## Decisiones Técnicas

- **BigInt**: Se agregó `toJSON()` global en `src/types/bigint.d.ts` para serialización correcta en JSON.
- **Seed idempotente**: `prisma/seed.ts` verifica si ya hay datos antes de insertar.
- **Docker compose**: Usa `prisma db push` en vez de `migrate dev` para evitar conflictos de migraciones. Directorio `prisma/` montado como volumen para persistir migraciones.
- **Auto-login**: El endpoint `POST /api/gimnasios` retorna token JWT para login automático post-registro.
- **Roles**: `Administrador`, `Recepcionista`, `Entrenador` — validados por Zod y comparados en middleware.
- **Refresh Token**: Modelo `RefreshToken` en Prisma, repositorio dedicado, endpoint `POST /api/auth/refresh`, store de Zustand con `refresh()`.
- **Partial Unique Index**: `@@unique([id_cliente, estado])` condicional con `estado = 'activo'` en `ClienteMembresia` para evitar membresías activas duplicadas.
- **Error Boundary**: `ErrorBoundary.tsx` componente clase para capturar errores de render en desarrollo.
- **Framer Motion**: Animaciones en Landing via `motion.*`, `useInView`, `AnimatePresence`. Animaciones sutiles: fadeUp, slideUp, scale.
- **Lucide React**: Todos los iconos son de Lucide (eliminados SVG inline y emojis). 27 iconos verificados.

## Diseño Visual (UI/UX Pro Max + PulseFit)

### Tema oscuro (`frontend/src/index.css`)

| Token | Valor | Descripción |
|-------|-------|-------------|
| `--color-primary` | `#F97316` | Naranja principal (botones, links, acentos) |
| `--color-primary-hover` | `#EA580C` | Hover del primario |
| `--color-background` | `#090909` | Fondo general |
| `--color-surface` | `#121212` | Superficies (tarjetas, sidebars) |
| `--color-surface-light` | `#1B1B1B` | Hover de superficies, headers de tabla |
| `--color-foreground` | `#FFFFFF` | Texto principal |
| `--color-muted` | `#94A3B8` | Texto secundario |
| `--color-muted-dark` | `#64748B` | Texto terciario / etiquetas |
| `--color-border` | `rgba(255,255,255,0.08)` | Bordes generales |
| `--color-ring` | `#F97316` | Focus rings |
| `--font-heading` | `Bebas Neue` | Títulos grandes |
| `--font-body` | `Inter` | Texto general |
| `--radius-card` | `18px` | Tarjetas |
| `--radius-button` | `14px` | Botones |
| `--radius-input` | `10px` | Inputs |

### Logos oficiales

| Archivo | Ubicación | Uso |
|---------|-----------|-----|
| `Logo/Logo completo.png` | 1812×868 | Fuente original |
| `Logo/Logo_completo-removebg-preview.png` | 722×346 (sin fondo) | **Login** — `public/assets/logo-completo.png`, 170px de ancho, centrado fuera de la tarjeta |
| `Logo/Logo minimalista.png` | 401×330 | Fuente original |
| `Logo/Logo_minimalista-removebg-preview.png` | 77KB (sin fondo) | **Sidebar** — `public/assets/logo-minimalista.png`, 38px de alto, junto a "FitManager" |
| `Logo/Logo_minimalista-removebg-preview.png` | — | **Favicon** — `public/favicon.png` |

### Layout del Dashboard

- **Sidebar**: 300px, `h-dvh`, `flex-col justify-between`, `overflow-hidden`, padding 20px
- **Brand**: logo 44px (w-11) + título 32px + subtítulo 15px
- **Items menú**: 48px altura, gap 12px, border-radius 14px, texto 16px, `space-y-0.5`
- **Activo**: `bg-primary` sólido (sin gradiente), texto blanco, sombra
- **Footer**: borde `rgba(255,255,255,0.08)`, avatar 36px, nombre + email, botón cerrar sesión con mismo estilo de menú
- **Header interno**: título `clamp(36px, 3vw, 52px)` Bebas Neue, subtítulo 18px, padding 32px
- **Contenido**: padding 32px, `overflow-y-auto`
- **Contenedor principal**: `w-full h-dvh overflow-hidden`

### Pantalla de Login

- Logo fuera de la tarjeta, centrado, 170px de ancho, separación 24px hacia el formulario
- Sin nav superior, sin texto "FITMANAGER" redundante
- Conjunto desplazado `pt-8` para mejor balance visual
- Estructura: Logo → 24px → Card (título, descripción, inputs, botón, registro)

### Historial de refactors visuales

1. Tema PulseFit dark (#ff6b35 → #F97316, fondos #0b0b0b → #090909)
2. Sidebar rediseñada (320px → 300px, estructura tipo spec con brand + menú + footer)
3. Layout corregido (h-dvh, sin scroll en sidebar, footer siempre visible)
4. Logos oficiales integrados (login, sidebar, favicon)
5. Rediseño de todas las páginas internas (tablas dark, formularios dark, badges, selects)
6. Componentes Button/Input con estilos dark consistentes

## Endpoints Activos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/gimnasios` | No | Registrar gimnasio (retorna token) |
| POST | `/api/auth/login` | No | Iniciar sesión |
| POST | `/api/auth/logout` | Sí | Cerrar sesión |
| POST | `/api/auth/refresh` | No | Refrescar token |
| GET | `/api/usuarios` | Sí | Listar usuarios del gimnasio |
| POST | `/api/usuarios` | Sí | Crear usuario |
| PUT | `/api/usuarios/:id` | Sí | Actualizar usuario |
| DELETE | `/api/usuarios/:id` | Sí | Eliminar usuario |
| GET | `/api/clientes` | Sí | Listar clientes (filtro por `?cedula=`) |
| POST | `/api/clientes` | Sí | Crear cliente |
| PUT | `/api/clientes/:id` | Sí | Actualizar cliente |
| DELETE | `/api/clientes/:id` | Sí | Eliminar cliente |
| GET | `/api/membresias` | Sí | Listar planes |
| POST | `/api/membresias` | Sí | Crear plan |
| PUT | `/api/membresias/:id` | Sí | Actualizar plan |
| DELETE | `/api/membresias/:id` | Sí | Eliminar plan |
| GET | `/api/clientes-membresias` | Sí | Listar asignaciones (`?id_cliente=`) |
| POST | `/api/clientes-membresias` | Sí | Asignar membresía |
| POST | `/api/clientes-membresias/:id/renovar` | Sí | Renovar |
| POST | `/api/clientes-membresias/:id/cancelar` | Sí | Cancelar |
| GET | `/api/clientes-membresias/:id/estado` | Sí | Consultar estado |
| GET | `/api/notificaciones` | Sí | Listar notificaciones |
| GET | `/api/notificaciones/contar` | Sí | Contar no leídas |
| POST | `/api/notificaciones/generar` | Sí | Generar alertas |
| PUT | `/api/notificaciones/:id/leer` | Sí | Marcar como leída |
| GET | `/api/pagos` | Sí | Listar pagos |
| POST | `/api/pagos` | Sí | Registrar pago |

## Datos de Prueba

- Admin: `admin@fitmanager.com` / `123456`
- Entrenadores: `svargas@fitmanager.com`, `dmora@fitmanager.com` / `123456`
- Clientes seed: Juan Pérez, María González, Luis Solís
- Planes seed: Básica (₡15/30d), Premium (₡35/30d), Trimestral (₡90/90d)

## Docker

```bash
docker compose up -d --build
```

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Frontend | http://localhost:5173 | — |
| Backend | http://localhost:3000 | — |
| PostgreSQL | localhost:5432 | fitmanager / fitmanager_secret |
| pgAdmin | http://localhost:5050 | admin@fitmanager.com / admin123 |

## Git Workflow

- `main` → `develop` → `feature/HU-XX-descripcion`
- Commits en español con Conventional Commits
- PR a develop con squash merge
- Branch eliminada post-merge
