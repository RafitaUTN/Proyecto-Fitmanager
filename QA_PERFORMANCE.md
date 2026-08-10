# Reporte local de performance QA

> Carga moderada y corta en Docker local. No es prueba DDoS ni estimación contractual de producción.

## Resultado

| Escenario | VUs | Requests | Duración | Throughput | Error rate | p50 | p95 | p99 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Gimnasio pequeño | 10 | 200 | 0,59 s | 337,23 req/s | 0% | 26,31 ms | 58,97 ms | 75,34 ms |
| Dos gimnasios | 12 | 240 | 0,63 s | 379,21 req/s | 0% | 30,09 ms | 45,55 ms | 56,37 ms |
| Hora pico | 15 | 450 | 1,09 s | 411,33 req/s | 0% | 34,05 ms | 55,14 ms | 62,32 ms |

Total: **890 requests, 890 respuestas 200, 0 timeouts, 0×429, 0×5xx**.

## Endpoints más lentos por p95 observado

| Escenario | Endpoint | p95 |
|---|---|---:|
| Pequeño | `/rutinas` | 79,21 ms |
| Pequeño | `/pagos` | 70,60 ms |
| Pequeño | `/dashboard/indicadores` | 67,06 ms |
| Dos gimnasios | `/pagos` | 61,17 ms |
| Hora pico | `/pagos` | 62,87 ms |
| Hora pico | `/rutinas` | 62,17 ms |

## Recursos

| Componente | Antes | Pico observado | Después |
|---|---|---|---|
| Backend | 0,09% CPU / 173,9 MiB | 134,65% CPU / 220,7 MiB | 0,10% / 220,7 MiB |
| PostgreSQL | 0% CPU / 86,85 MiB | 61,02% CPU / 113,7 MiB | 0,02% / 113,7 MiB |

La memoria no regresó inmediatamente al baseline, pero la ventana fue demasiado corta para declarar fuga. Repetir en una prueba de 15–30 minutos con métricas de heap/conexiones antes de promoción.

## Observaciones

- Ningún p95 simple superó 1 segundo.
- No hubo contaminación visible de tenants durante carga concurrente A/B.
- Advertencia frontend: chunk `Dashboard` de 619,22 kB minificado.
- Advertencia backend durante tests: patrón `client.query()` deprecado para `pg@9`.
- Resultado: **ACCEPTABLE local / NEEDS SOAK TEST para capacidad real**.
