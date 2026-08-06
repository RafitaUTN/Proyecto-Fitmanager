# Protocolo de la sesión de usabilidad — RNF-06

Guion para aplicar con cada participante. Duración estimada: 20 minutos.

El RNF-06 exige que los usuarios completen las tareas principales **sin capacitación previa extensa**. Por eso la regla más importante del protocolo es esta: **no explique cómo se usa el sistema**. Si lo hace, deja de medir la usabilidad de la interfaz y pasa a medir la calidad de su explicación.

## Antes de empezar

- [ ] El sistema corriendo y accesible en `http://localhost:5173`
- [ ] Una cuenta de prueba lista, con datos sembrados
- [ ] La sesión anterior cerrada (Local Storage limpio)
- [ ] Papel para anotar observaciones
- [ ] El cuestionario impreso o abierto en otra pantalla

Use un usuario distinto por participante, o restablezca los datos entre sesiones. Si el segundo participante encuentra al cliente que registró el primero, la tarea deja de ser comparable.

## Introducción (2 minutos)

Léala tal cual, para que todos los participantes reciban lo mismo:

> Gracias por participar. Vamos a probar FitManager, un sistema para administrar gimnasios.
>
> Quiero aclarar algo importante: **no lo estamos evaluando a usted, estamos evaluando el sistema**. Si algo le resulta confuso, es un problema del diseño, no suyo. Esa información es justamente la que nos sirve.
>
> Le voy a pedir que haga cuatro tareas. Trate de resolverlas por su cuenta. Si se traba, dígamelo, pero no voy a poder ayudarle mucho porque necesito ver dónde se traba la gente.
>
> Si puede, vaya diciendo en voz alta lo que está pensando: qué busca, qué espera que pase al hacer clic en algo. Eso me ayuda a entender su razonamiento.
>
> Puede detenerse cuando quiera. ¿Alguna duda antes de empezar?

## Tareas

Las cuatro corresponden a las que el RNF-06 nombra: registrar clientes, pagos y asistencias.

Entregue una tarea a la vez. No adelante la siguiente.

### Tarea 1 — Ingresar al sistema

> Ingrese al sistema con el correo `admin@powerfit.com` y la contraseña `123456`.

Tiempo esperado: menos de 1 minuto.

### Tarea 2 — Registrar un cliente

> Acaba de llegar un cliente nuevo al gimnasio. Se llama María Fernández, cédula 118920456, teléfono 8888-1234, correo maria.fernandez@ejemplo.com. Regístrelo en el sistema.

Tiempo esperado: 2 a 3 minutos.

Observe: ¿encuentra la sección de clientes sin ayuda? ¿Entiende qué campos son obligatorios?

### Tarea 3 — Asignar una membresía y registrar el pago

> A María le vendieron un plan mensual y lo pagó en efectivo. Regístrelo.

Tiempo esperado: 3 a 4 minutos.

Observe: ¿asume que asignar la membresía ya registra el pago? Es el punto donde más gente se confunde, porque son dos acciones separadas.

### Tarea 4 — Registrar la entrada de un cliente

> María llegó al gimnasio a entrenar. Registre su ingreso.

Tiempo esperado: 1 a 2 minutos.

## Durante la sesión

**Anote, no intervenga.** Registre por cada tarea:

- ¿La completó? (sí / no / con ayuda)
- Cuánto tardó
- Dónde dudó, qué buscó en el lugar equivocado
- Qué dijo en voz alta

Si pregunta "¿dónde está...?", responda **"¿dónde lo buscaría usted?"**. Esa respuesta vale más que la ayuda.

Solo intervenga si lleva más de 5 minutos trabado o si se frustra visiblemente. Anótelo como tarea no completada.

## Después (5 minutos)

Entregue el cuestionario SUS. Pida que lo llene **solo, sin comentarlo con usted**. Si se queda al lado esperando, la gente tiende a subir las notas por cortesía.

Aclare únicamente lo mecánico:

> Son diez afirmaciones. Marque del 1 al 5, donde 1 es que está totalmente en desacuerdo y 5 que está totalmente de acuerdo. Responda con su primera impresión, sin pensarlo demasiado.

Si pregunta qué significa alguna afirmación, no la reinterprete: pídale que responda según lo que entienda. Reformularla cambia el instrumento y los resultados dejan de ser comparables con los de otros participantes.

Al final, dos preguntas abiertas:

> ¿Qué fue lo más confuso?
>
> ¿Qué cambiaría?

Las respuestas no entran en el puntaje, pero son el mejor material para la sección de mejoras del informe.

## Después de todas las sesiones

1. Vacíe las respuestas en `sus-fitmanager.xlsx`
2. Lea el resultado en la hoja **Resultado**
3. Junte las observaciones cualitativas por tema

Para el informe, guarde: el puntaje promedio, la tabla de tareas completadas, y los dos o tres problemas que más se repitieron.

Si la desviación estándar sale alta, revise si se corresponde con el rol de los participantes. Suele ser la pista más útil: una interfaz puede resultar clara para un administrador y confusa para un recepcionista.
