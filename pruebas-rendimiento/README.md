# Pruebas de rendimiento — RNF-01 y RNF-07

Verificación de dos requisitos no funcionales del proyecto.

> **RNF-01 (Rendimiento).** El sistema deberá responder al 95% de las solicitudes principales en un tiempo máximo de 2 segundos bajo una carga simulada de 50 usuarios concurrentes, verificado mediante pruebas de rendimiento con Apache JMeter.

> **RNF-07 (Escalabilidad).** El sistema deberá soportar hasta 10 gimnasios registrados y 1,000 clientes activos en total sin degradación significativa del rendimiento, manteniendo los tiempos de respuesta establecidos en el RNF-01.

Los dos se verifican con la misma corrida: primero se siembra el volumen del RNF-07, luego se aplica la carga del RNF-01 sobre él. Medir el RNF-01 contra una base casi vacía no demostraría nada, porque cualquier consulta responde rápido sobre veinte filas.

## Archivos

| Archivo | Qué hace |
|---|---|
| `fitmanager-rnf01.jmx` | Plan de JMeter: 50 usuarios concurrentes sobre los endpoints principales |
| `sembrar-carga.ts` | Crea 10 gimnasios y 1000 clientes con membresías, pagos y asistencias |

## Requisitos

- Apache JMeter 5.6 o superior — https://jmeter.apache.org/download_jmeter.cgi
- Java 8 o superior (JMeter lo necesita)
- El proyecto corriendo (`docker compose up -d`)

Verifica JMeter con:

```bash
jmeter --version
```

## Procedimiento

### 1. Sembrar el volumen del RNF-07

```bash
docker compose exec backend npx tsx /app/../pruebas-rendimiento/sembrar-carga.ts
```

Si esa ruta no resuelve dentro del contenedor, córrelo desde `backend/` en tu máquina con la base accesible en el puerto que uses:

```bash
cd backend
npx tsx ../pruebas-rendimiento/sembrar-carga.ts
```

Tarda entre uno y tres minutos. El script limpia siembras anteriores antes de empezar, así que se puede repetir sin acumular basura.

Al terminar imprime las credenciales de los gimnasios sembrados.

### 2. Ejecutar el plan de carga

```bash
cd pruebas-rendimiento

jmeter -n -t fitmanager-rnf01.jmx \
       -l resultados.jtl \
       -e -o reporte-html \
       -Jcorreo=carga-admin1@prueba.local \
       -Jpassword=123456
```

- `-n` modo sin interfaz, que es el recomendado para medir: la GUI de JMeter consume recursos y distorsiona los tiempos
- `-l` archivo crudo de resultados
- `-e -o` genera el reporte HTML

Dura 5 minutos por defecto.

### 3. Leer el resultado

Abre `reporte-html/index.html`. En **Statistics**, la columna que responde al RNF-01 es **95th percentile**.

**El requisito se cumple si el percentil 95 de cada endpoint está por debajo de 2000 ms.**

Revisa también:

- **Error %** debe ser 0. Si hay errores, los tiempos no son comparables.
- **Throughput** indica cuántas solicitudes por segundo aguantó.
- **APDEX** en la primera sección resume la satisfacción del usuario.

### 4. Evidencia para el entregable

Guarda para el informe:

- La captura de la tabla **Statistics** con la columna del percentil 95
- El gráfico **Response Times Over Time**
- El conteo de gimnasios y clientes sembrados, que acredita el RNF-07

## Parámetros ajustables

Todos se pasan con `-J`:

| Parámetro | Por defecto | Para qué |
|---|---|---|
| `host` | `localhost` | Servidor a probar |
| `puerto` | `3000` | Puerto del backend |
| `usuarios` | `50` | Hilos concurrentes (el RNF-01 pide 50) |
| `rampa` | `30` | Segundos para levantar todos los hilos |
| `duracion` | `300` | Segundos de duración |
| `correo` | `admin@powerfit.com` | Usuario de la prueba |
| `password` | `123456` | Contraseña |

Ejemplo de corrida corta para comprobar que el plan funciona antes de la medición formal:

```bash
jmeter -n -t fitmanager-rnf01.jmx -l prueba.jtl -Jusuarios=5 -Jduracion=30
```

## Endpoints incluidos

Se eligieron los que el RNF-01 llama "solicitudes principales", es decir las que un usuario real ejecuta a diario:

- `POST /api/auth/login` — una vez por hilo, para obtener el JWT
- `GET /api/clientes`
- `GET /api/dashboard`
- `GET /api/membresias`
- `GET /api/asistencias`
- `GET /api/pagos`
- `GET /api/reportes/ingresos-mensuales`

El de reportes es deliberadamente el más pesado: agrega sobre varias tablas y es el primero que se degrada al crecer el volumen. Si algo va a incumplir el umbral, es ese.

Cada solicitud lleva una aserción de duración de 2000 ms, así que los incumplimientos aparecen marcados como error en el reporte además de reflejarse en el percentil.

Hay una pausa aleatoria de 1 a 3 segundos entre acciones de un mismo usuario. Sin ella la prueba mediría un martilleo que ningún usuario real produce, y los resultados saldrían artificialmente malos.

## Si no se cumple el umbral

Antes de tocar el código, descarta lo obvio:

1. **Docker con poca memoria.** El contenedor por defecto puede tener menos RAM de la necesaria. Revísalo en Docker Desktop → Settings → Resources.
2. **Estás corriendo JMeter en la misma máquina que la aplicación.** Compiten por CPU. Es aceptable para el curso, pero conviene anotarlo como limitación en el informe.
3. **Modo desarrollo.** El backend corre con `tsx watch`, que es más lento que el build de producción. Para una medición formal, usar `docker-compose.prod.yml`.

Si aun así falla, el primer sospechoso son los índices. El `schema.prisma` ya declara índices sobre `id_gimnasio`, `correo`, `cedula` y `fecha_registro`; el endpoint de reportes es el candidato a necesitar más.

## Limitación conocida

Esta prueba corre contra un entorno local, no contra producción. Los números sirven para verificar el requisito en las condiciones del curso, pero no predicen el comportamiento en un despliegue real, donde influyen la latencia de red, el plan de la base de datos gestionada y los recursos del proveedor. Conviene declararlo así en el informe en vez de presentar los resultados como definitivos.
