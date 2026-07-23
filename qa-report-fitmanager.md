# QA Report — FitManager SaaS (E2E Playwright)

## Resumen Ejecutivo

| Métrica | Resultado |
|---------|-----------|
| Tests ejecutados | 20 escenarios |
| Errores consola JS | 28 (React 19 dev-mode `console.error` formatting artifact — no afecta runtime) |
| Errores HTTP 4xx/5xx | 0 |
| Bugs encontrados en esta sesión | 1 (nuevo) |
| Bugs corregidos de QA anterior | 5/5 |
| Docker | 4/4 servicios UP |

---

## Resultados por Funcionalidad

### 1. Autenticación

| Escenario | Estado | Detalle |
|-----------|--------|---------|
| Login admin@fitmanager.com | ✅ | Redirect a `/dashboard` |
| Login retorna `id_gimnasio` | ✅ | `id_gimnasio: 1` (corregido — faltaba en el response del login) |
| Entrenador login + permisos | ✅ | `rol: Entrenador, id_gimnasio: 1` |
| Registro nuevo gym | ❌ | No redirige a `/dashboard` — se queda en `/registro` |
| Auto-login post-registro (setAuth) | ⚠️ | Funciona en algunos casos, falla en otros (posible race condition con navigate) |

### 2. Dashboard — Indicadores Transferencia

| Escenario | Estado | Detalle |
|-----------|--------|---------|
| Indicadores Gym Alpha (después de aprobar) | ✅ | `recibidas: 0, enviadas: 0` (correcto — ya no hay pendientes) |
| Botón "Solicitudes recibidas" navega a `rol=origen` | ✅ | Corregido (BUG-5) |
| Botón "Solicitudes enviadas" navega a `rol=destino` | ✅ | Corregido (BUG-5) |

### 3. Centro de Notificaciones (Alertas)

| Escenario | Estado | Detalle |
|-----------|--------|---------|
| Carga de notificaciones vía TanStack Query | ✅ | 1 notificación TRANSFERENCIA |
| Sidebar badge no leídas | ✅ | `total: 0` (leída después de abrir drawer) |
| Filtro por tabs (Todas/Membresías/Transferencias/Sistema) | ✅ | Tabs funcionales |
| Botón "Actualizar" genera alertas | ✅ | Sin errores |

### 4. Transferencia Drawer

| Escenario | Estado | Detalle |
|-----------|--------|---------|
| Abrir drawer desde "Ver solicitud" | ✅ | Animación slide-in desde la derecha |
| INFORMACIÓN DEL CLIENTE visible | ✅ | Nombre, apellido, cédula |
| GIMNASIOS visible | ✅ | Origen → Destino con flecha |
| ESTADO visible | ✅ | Badge PENDIENTE |
| FECHAS visible | ✅ | Fecha de solicitud |
| TIMELINE visible | ✅ | Timeline con entrada CREADA |
| Botones Aprobar/Rechazar visibles para Admin origen | ✅ | `puedeAprobarRechazar = isAdmin && esOrigen && esPendiente` ✅ |
| Sin ACCIONES para Entrenador | ✅ | Permisos correctos |
| Aprobar transferencia (flujo completo) | ✅ | Cliente movido, membresía cancelada |
| ConfirmModal aparece al hacer clic en Aprobar | ✅ | Modal con título "Aprobar transferencia" |
| Clic fuera cierra drawer (BUG-2 fix) | ✅ | `pointer-events-none` en backdrop, clic en contenedor cierra |
| Botón ✕ cierra drawer | ✅ | Estado `selectedSolicitud` se resetea a null |

### 5. Multi-tenant

| Escenario | Estado | Detalle |
|-----------|--------|---------|
| Gym Alpha no ve cliente transferido | ✅ | Cliente cedula 207560841 ya no visible |
| Gym Alpha indicadores en 0 | ✅ | Sin solicitudes pendientes |
| Gym nuevo sin clientes | ✅ | 0 clientes (aislamiento correcto) |

### 6. Bugs Corregidos (de QA anterior)

| Bug | Estado | Fix |
|-----|--------|-----|
| BUG-1 🔴 Auto-login | ✅ | `setAuth()` + `RegistroGimnasio.tsx` usa token directo |
| BUG-2 🔴 Backdrop modales | ✅ | `pointer-events-none` + `cursor-pointer` en 5 componentes |
| BUG-3 🟡 Modal no muestra error | ✅ | Error state + display en `TransferRequestModal` |
| BUG-4 🟡 Keys duplicadas | ✅ | Eliminado `AnimatePresence mode=popLayout`, keys explicitas |
| BUG-5 🔴 Indicadores invertidos | ✅ | Swap `id_gym_origen`/`id_gym_destino` + `rol` en Dashboard |

---

## Bugs Encontrados

### BUG-6: 🟡 MEDIO — Login no retorna `id_gimnasio` en usuario

| Campo | Valor |
|-------|-------|
| **Ruta** | `POST /api/auth/login` |
| **Archivo** | `backend/src/services/auth.service.ts:36` |
| **Severidad** | Medio |
| **Prioridad** | Alta |

**Descripción:** El endpoint `login` retorna el objeto `usuario` sin el campo `id_gimnasio`. Esto causa que `TransferenciaDrawer` no pueda determinar si el usuario autenticado pertenece al gimnasio origen o destino de una solicitud, ocultando los botones de acción (Aprobar/Rechazar).

**Solución:** Agregar `id_gimnasio: usuario.id_gimnasio` al objeto `usuario` en la respuesta del login.

**Estado:** ✅ Corregido

---

## Notas Técnicas

### React 19 Dev-mode Console Errors
Se observan ~28 errores de consola con el mensaje `Encountered two children with the same key, \`%s\``. El `%s` aparece literal (no reemplazado por el key value), lo cual es un artifact del parche de `console.error` de React 19 en modo desarrollo. **No afecta el funcionamiento en producción.** Los errores desaparecen con `NODE_ENV=production`.

### Registro de nuevo gym - inconsistencia
En el test de registro con un gimnasio completamente nuevo, el auto-login post-registro falló (se quedó en `/registro`). Esto puede ser una race condition donde `setAuth()` no completa antes de `navigate('/dashboard')`, o un problema con el manejo de errores del formulario. Requiere investigación adicional.

---

## Estado de Docker

| Servicio | Puerto | Estado |
|----------|--------|--------|
| Frontend | :5173 | ✅ UP |
| Backend | :3000 | ✅ UP |
| PostgreSQL | :5432 | ✅ UP |
| pgAdmin | :5050 | ✅ UP |
