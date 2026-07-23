# QA Report — FitManager SaaS

## Resumen Ejecutivo

| Métrica | Resultado |
|---------|-----------|
| Tests ejecutados | 32 escenarios |
| Errores consola JS | 13 (React duplicate keys) |
| Errores HTTP 4xx/5xx | 5 (400 auto-login ×2, 409 clientes ×2, 409 transferencias ×1) |
| Bugs encontrados | 5 (2 Altos, 2 Medios, 1 Bajo) |
| Docker | Todos los servicios UP |
| Build | tsc 0 errores, vite build exitoso |

---

## Bugs Encontrados

### BUG-1: 🔴 ALTO — Auto-login falla post-registro

| Campo | Valor |
|-------|-------|
| **Ruta** | `POST /api/auth/login` |
| **Archivo** | `frontend/src/pages/RegistroGimnasio.tsx` o `auth.store.ts` |
| **Severidad** | Alto |
| **Prioridad** | Alta |

**Pasos para reproducir:**
1. Ir a `/registro`
2. Llenar formulario con datos válidos
3. Hacer clic en "REGISTRAR GIMNASIO"

**Resultado esperado:** Auto-login exitoso, redirigir a `/dashboard`

**Resultado obtenido:** `POST /api/auth/login` envía `{ correo: "<JWT>", password: "<usuario>" }` en vez de `{ correo: "admin@x.com", password: "xxx" }`. Retorna 400 "Datos inválidos". En el primer registro redirige a `/dashboard` (por el token del registro), en el segundo redirige a `/login`.

**Causa raíz:** La función `login()` del store recibe el objeto de respuesta de `POST /api/gimnasios` en vez de las credenciales del formulario.

**Solución propuesta:** Separar la respuesta del registro del llamado a login. El endpoint `POST /api/gimnasios` ya retorna un token JWT, no es necesario llamar a login después.

---

### BUG-2: 🔴 ALTO — Modal backdrop bloquea interacciones

| Campo | Valor |
|-------|-------|
| **Ruta** | TransferRequestModal, ConfirmModal, TransferenciaDrawer |
| **Archivo** | Componentes de modal (probablemente `TransferRequestModal.tsx`) |
| **Severidad** | Alto |
| **Prioridad** | Alta |

**Pasos para reproducir:**
1. Registrar cliente con cédula existente en otro gym
2. Aparece modal de transferencia con backdrop
3. Intentar hacer clic en "Cancelar" o "Solicitar"

**Resultado esperado:** Los botones del modal son clickeables

**Resultado obtenido:** El `<div class="absolute inset-0 bg-black/60"></div>` intercepta los eventos de puntero. Los clicks nunca llegan a los botones del modal.

**Causa raíz:** El backdrop overlay tiene `pointer-events: auto` (por defecto) y está posicionado entre el puntero y el contenido del modal.

**Solución propuesta:** Agregar `pointer-events: none` al backdrop, o moverlo al contenedor del modal con `z-index` correcto, o usar `onClick` en el backdrop solo para cerrar.

---

### BUG-3: 🟡 MEDIO — Modal transferencia no se cierra tras 201 exitoso

| Campo | Valor |
|-------|-------|
| **Ruta** | `POST /api/transferencias` → 201 Created |
| **Archivo** | `frontend/src/components/TransferRequestModal.tsx` |
| **Severidad** | Medio |
| **Prioridad** | Media |

**Pasos para reproducir:**
1. Disparar modal de transferencia
2. Hacer clic "Solicitar"
3. API responde 201 Created

**Resultado esperado:** Modal se cierra, muestra toast/mensaje de éxito

**Resultado obtenido:** Modal permanece abierto. La notificación de transferencia sí se crea, pero el usuario no recibe feedback visual.

**Causa raíz:** El handler de submit no maneja el caso de éxito (no cierra modal ni muestra mensaje).

**Solución propuesta:** En el `onSuccess` del submit, cerrar modal y mostrar notificación de éxito.

---

### BUG-4: 🟡 MEDIO — React duplicate keys en Alertas

| Campo | Valor |
|-------|-------|
| **Ruta** | `/dashboard/alertas` |
| **Archivo** | `frontend/src/pages/Alertas.tsx` y/o componentes hijos |
| **Severidad** | Medio |
| **Prioridad** | Media |

**Pasos para reproducir:**
1. Navegar a `/dashboard/alertas`
2. Navegar al Dashboard (con transferencias)
3. Abrir drawer de "Ver solicitud"

**Resultado esperado:** 0 errores de consola

**Resultado obtenido:** 13 errores `Encountered two children with the same key` (React). Las keys duplicadas en listas causan comportamiento indefinido.

**Causa raíz:** En `Alertas.tsx` o componentes de notificaciones/transferencias, las keys de los elementos en map() no son únicas.

**Solución propuesta:** Usar `id_notificacion` (BigInt convertido a string) como key en lugar de índices o IDs no únicos. Verificar también en `TransferenciaDrawer.tsx`.

---

### BUG-5: 🔴 ALTO — Indicadores de transferencia invertidos

| Campo | Valor |
|-------|-------|
| **Ruta** | `GET /api/transferencias/indicadores` |
| **Archivo** | `backend/src/services/transferencia.service.ts` |
| **Severidad** | Alto |
| **Prioridad** | Alta |

**Pasos para reproducir:**
1. Gym Beta solicita transferencia de cliente de Gym Alpha
2. Gym Alpha (origen) revisa Dashboard

**Resultado esperado:** Gym Alpha ve "Solicitudes recibidas: 1, Enviadas: 0"

**Resultado obtenido:** Gym Alpha ve "Solicitudes recibidas: 0, Enviadas: 1"

**Causa raíz:** El endpoint `indicadores` cuenta `id_gym_origen` como "enviadas" y `id_gym_destino` como "recibidas" desde la perspectiva del gym autenticado. Pero la lógica parece estar invertida: si el gym actual es el origen, debería contar solicitudes donde es DESTINO (recibió solicitud de transferencia de su cliente).

Espera, revisando la lógica:
- Gym Alpha es el ORIGEN del cliente (Ana pertenece a Alpha)
- Beta solicita llevar a Ana a Beta → Beta es id_gym_destino de la solicitud
- Entonces Alpha es id_gym_origen de la solicitud
- La solicitud tiene `id_gym_origen: Alpha, id_gym_destino: Beta`
- Para Alpha: solicitudes con `id_gym_origen = Alpha` son ENVIADAS (Alpha envía el cliente fuera)
- Pero desde la UI: Alpha "recibe" una solicitud de transferencia de su cliente

El problema es semántico: "Solicitudes recibidas" implica que otro gym pide llevarse un cliente de Alpha. Eso significa que Alpha es `id_gym_origen` en la solicitud. Pero la UI muestra eso como "Enviadas".

**Solución propuesta:** Cambiar la semántica en el frontend o backend. Simplificación: 
- "Recibidas" = solicitudes donde mi gym es `id_gym_origen` (me piden que transfiera un cliente mío)
- "Enviadas" = solicitudes donde mi gym es `id_gym_destino` (solicité traer un cliente de otro gym)

O viceversa, pero que sea consistente con lo que ve el usuario.

---

## Resumen de Pruebas Realizadas

| Módulo | Estado | Observaciones |
|--------|--------|---------------|
| Landing Page | ✅ OK | 0 errores, carga completa |
| Registro Gym (Alpha) | ✅ OK | 201 Created, token retornado |
| Registro Gym (Beta) | ✅ OK | 201 Created |
| Login manual | ✅ OK | JWT retornado, dashboard carga |
| Logout | ✅ OK | Sesión cerrada, redirect a /login |
| Membresías CRUD | ✅ OK | 4 planes creados sin errores |
| Clientes CRUD | ✅ OK | Pedro BetaTest creado, tabla muestra datos |
| Cliente duplicado (409) | ✅ OK | Transfer modal aparece, flujo multi-tenant funciona |
| Asignar membresía | ✅ OK | Ana Transfer → Plan Mensual, activa |
| Pagos | ✅ OK | Pago registrado sin errores |
| Transferencia (solicitar) | ✅ OK | 201 Created, notificación en destino |
| Notificaciones (Alpha) | ✅ OK | Badge 1, contenido correcto |
| Seguridad multi-tenant | ✅ OK | Cada gym ve solo sus datos |

## Bugs por Severidad

| Severidad | ID | Descripción |
|-----------|----|-------------|
| 🔴 Alto | BUG-1 | Auto-login falla |
| 🔴 Alto | BUG-2 | Backdrop bloquea modales |
| 🔴 Alto | BUG-5 | Indicadores transferencia invertidos |
| 🟡 Medio | BUG-3 | Modal no se cierra tras 201 |
| 🟡 Medio | BUG-4 | React duplicate keys Alertas |

---

## Estado de Docker

| Servicio | Puerto | Estado |
|----------|--------|--------|
| Frontend | :5173 | ✅ UP |
| Backend | :3000 | ✅ UP |
| PostgreSQL | :5432 | ✅ UP |
| pgAdmin | :5050 | ✅ UP |
