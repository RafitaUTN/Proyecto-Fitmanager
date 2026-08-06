# Prueba de usabilidad — RNF-06

> **RNF-06 (Usabilidad).** La interfaz deberá permitir que usuarios internos completen tareas principales, como registrar clientes, pagos y asistencias, sin capacitación previa extensa, obteniendo una puntuación mínima de 80 puntos en la escala System Usability Scale (SUS) (Brooke, 1996).

Este es el único requisito del proyecto que **no se puede automatizar**. El SUS mide la percepción de personas reales usando el sistema; no hay forma de generarlo con código. Lo que hay aquí es el instrumento listo para aplicar.

## Archivos

| Archivo | Qué es |
|---|---|
| `sus-fitmanager.xlsx` | Hoja de captura con el cálculo del puntaje ya programado |
| `protocolo.md` | Guion de la sesión y las tareas que ejecuta cada participante |

## Qué falta hacer

1. Conseguir entre **8 y 12 participantes**. Brooke recomienda ese mínimo para que el promedio sea estable; con 3 o 4 el resultado es ruido.
2. Aplicar el protocolo con cada uno (unos 20 minutos por persona).
3. Vaciar las respuestas en `sus-fitmanager.xlsx`.
4. Leer el resultado en la hoja **Resultado**.

## Sobre los participantes

El RNF habla de **usuarios internos**: administradores, recepcionistas y entrenadores de gimnasio. Lo ideal es gente de ese perfil.

Si no se consigue, sirven personas sin relación con el proyecto que puedan ponerse en ese papel. Lo que **no** sirve es que lo llenen ustedes dos ni gente que ya vio el sistema: el SUS mide la primera impresión de alguien que no lo conoce, y quien lo desarrolló no puede tener esa impresión.

Anoten en el informe quiénes fueron y por qué. Un SUS de 85 con ocho desconocidos vale; el mismo 85 con los dos autores y tres amigos que ya lo habían visto, no.

## Cómo usar la hoja

Abran `sus-fitmanager.xlsx`.

**Hoja `Cuestionario`** — las 10 afirmaciones del SUS traducidas. Alternan a propósito entre positivas y negativas para obligar a leer cada una, en vez de marcar todo igual.

**Hoja `Respuestas`** — una fila por participante. Solo se llenan las celdas amarillas: rol y las respuestas P1 a P10, del 1 al 5. Las columnas Suma y Puntaje SUS se calculan solas.

La fila 6 trae un ejemplo en gris cursiva para mostrar el formato. **Bórrenla antes de entregar.** No entra en el promedio (los cálculos leen desde la fila 7), pero deja el archivo más limpio.

**Hoja `Resultado`** — promedio, mínimo, máximo, desviación estándar, y si se cumple o no el umbral de 80. Mientras no haya respuestas dice "sin datos" en lugar de mostrar un cero que se podría confundir con un mal resultado.

## Cómo se calcula el puntaje

No es un promedio simple de las respuestas.

- **Preguntas impares** (positivas): se resta 1 al valor marcado
- **Preguntas pares** (negativas): se resta el valor marcado a 5
- Se suman los diez resultados, lo que da un número entre 0 y 40
- Se multiplica por 2.5, lo que lo lleva a la escala de 0 a 100

La hoja ya lo hace. Se explica aquí porque es la clase de cosa que preguntan en una defensa.

**Un puntaje SUS no es un porcentaje.** Un 68 no significa "68% de satisfacción"; significa que está en el promedio de los sistemas evaluados con esta escala. Confundirlo es el error más común al presentar resultados de SUS.

## Interpretación

Según Bangor, Kortum y Miller (2009):

| Rango | Calificación |
|---|---|
| 85 – 100 | Excelente |
| 72 – 84 | Bueno |
| 52 – 71 | Aceptable |
| 39 – 51 | Pobre |
| 0 – 38 | Inaceptable |

El umbral de 80 que fijaron en el documento cae en la parte alta de "Bueno". Es una meta exigente pero razonable.

## Si el resultado no llega a 80

No lo maquillen. Un SUS de 74 bien documentado, con las observaciones de los participantes y una propuesta de mejora, vale más en una defensa que un 82 inventado.

La hoja incluye desviación estándar justamente para esto: si es alta, significa que unos participantes lo encontraron fácil y otros no, y ahí suele haber una pista concreta de qué parte de la interfaz falla.

## Referencias

Brooke, J. (1996). SUS: A quick and dirty usability scale. En P. W. Jordan et al. (Eds.), *Usability evaluation in industry* (pp. 189–194). Taylor & Francis.

Bangor, A., Kortum, P., y Miller, J. (2009). Determining what individual SUS scores mean: Adding an adjective rating scale. *Journal of Usability Studies, 4*(3), 114–123.
