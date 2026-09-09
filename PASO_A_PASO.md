# Candelaria — Paso a paso para construir la app

Guía operativa. Los bloques en gris se copian y se pegan tal cual en Claude Code.

---

## Fase 0 — Preparar la máquina (una sola vez)

**Paso 1.** Abrí PowerShell y verificá que las dos herramientas responden:

```
node --version
claude --version
```

Node tiene que devolver 18 o superior. Si `claude` no responde, es el problema
de PATH que quedó pendiente: cerrá y reabrí PowerShell, y si sigue, reinstalá.
No avances hasta que los dos comandos contesten.

**Paso 2.** Creá la carpeta del proyecto y meté adentro los cinco archivos:

```
C:\candelaria\
    ESPECIFICACION.md
    DISENO.md
    fixtures_productos.csv
    fixtures_insumos.csv
    fixtures_combos.json
    Velas y adornos Candelaria 18-8-26.xlsx
```

**Paso 3.** Iniciá control de versiones. **Esto no es opcional**: es lo que te
permite volver atrás cuando Claude Code rompa algo, y va a romper algo.

```
cd C:\candelaria
git init
git add .
git commit -m "Especificacion y fixtures"
```

Si no tenés git instalado, bajalo de git-scm.com. Son cinco minutos y te ahorra
un día.

---

## Fase 1 — Arrancar y fijar las reglas

**Paso 4.** Desde `C:\candelaria`, ejecutá:

```
claude
```

**Paso 5.** Primer mensaje. Esto crea el archivo de memoria del proyecto, que
Claude Code va a releer en cada sesión:

```
Leé ESPECIFICACION.md y DISENO.md completos. No escribas código todavía.

Creá un archivo CLAUDE.md que resuma las reglas invariantes del proyecto:
stack (PWA offline-first, IndexedDB, sin backend), idioma español, formato de
moneda argentino, la prohibición de valores literales fuera de tokens.css, la
prohibición de fuentes remotas, y el orden de trabajo obligatorio
(motor -> tests verdes -> interfaz -> importador).

Después decime en no más de 20 líneas qué entendiste que hay que construir, y
listame las dudas o contradicciones que encuentres entre los dos documentos.
```

**Paso 6.** Leé lo que contesta. Si algo no coincide con lo que hablamos,
corregilo ahí mismo antes de seguir. Si te plantea una duda que no sabés
responder, traémela.

---

## Fase 2 — Motor de cálculo (la fase que decide todo)

**Paso 7.**

```
Construí solamente el motor de cálculo, como funciones puras, sin interfaz y
sin base de datos. Seguí la sección 4 de ESPECIFICACION.md.

Después escribí los tests que lo validan contra fixtures_productos.csv,
fixtures_insumos.csv y fixtures_combos.json, con tolerancia 0,01.

Ejecutá los tests y no me contestes hasta que los 79 productos y los 21 combos
pasen. Si alguno falla, corregí el motor, nunca las fixtures.
```

**Paso 8.** No sigas hasta ver los tests en verde. Este es el punto de control
más importante de todo el proyecto: si el motor está bien, el resto es
presentación.

**Paso 9.** Guardá el avance:

```
git add . && git commit -m "Motor de calculo con tests en verde"
```

Repetí este comando **al final de cada fase**. Es tu punto de retorno.

---

## Fase 3 — Datos y estilos

**Paso 10.**

```
Ahora la capa de persistencia en IndexedDB, con el modelo de la sección 3 de
ESPECIFICACION.md: insumos, productos, combos, parámetros, pedidos con pagos e
historial.

Incluí la exportación y la importación del respaldo JSON.

Escribí los tests de las secciones 8.4 y 8.5 de los criterios de aceptación
(pagos parciales, saldo, historial, anulación de pagos). Ejecutalos.
```

**Paso 11.**

```
Creá tokens.css con exactamente los valores de la sección 2, 3 y 4 de
DISENO.md, y componentes.css encima.

Escribí el test que recorre todo el código y falla si encuentra un hexadecimal,
un rgb(, un valor literal de radio, sombra o espaciado fuera de tokens.css, o
una referencia a una fuente remota. Ejecutalo.
```

---

## Fase 4 — Interfaz

**Paso 12.** Una pantalla por vez. No le pidas las diez juntas: se le mezclan
los criterios y terminás revisando todo de nuevo.

```
Implementá la pantalla Vender según la sección 8.1 de DISENO.md.
Aplicá la sección 5 (regla de números y desbordes) sin excepción.
Cuando termines, mostrame cómo levantar la app en el navegador.
```

Después, en este orden, una por mensaje: **Productos → Ficha de producto →
Nuevo insumo → Pedido → Mensaje generado → Pedidos → Ajustes → Editor de
plantillas → Revisar importación**.

Vender y Pedido primero porque son las que vas a usar todos los días.

**Paso 13.** Cada dos o tres pantallas, mirá la app **en el celular**, no en el
monitor. Anotá lo que no se lee y pedí el ajuste concreto: "el saldo se corta",
"el botón queda tapado". Específico, no "no me gusta".

---

## Fase 5 — Importador (al final, no al principio)

**Paso 14.**

```
Ahora el importador de la planilla, según la sección 7 de ESPECIFICACION.md.
Aplicá las ocho reglas de limpieza. Importá el .xlsx de la carpeta y verificá
que los 79 productos resultantes reproduzcan los valores de las fixtures.
Mostrame el listado de registros marcados para revisión.
```

**Paso 15.**

```
Implementá la exportación e importación en Excel de la sección 5.6, con la
validación, la previsualización y el respaldo automático previo.
```

---

## Fase 6 — Ponerla en el celular

**Paso 16.**

```
Preparalá como PWA instalable: manifest, service worker, íconos, y que funcione
completa sin conexión. Después ejecutá los criterios de aceptación de la
sección 8 completos y mostrame el resultado.
```

**Paso 17.** Publicala. Es un sitio estático, así que alcanza con GitHub Pages
o Netlify, gratis. Pedile:

```
Explicame paso a paso cómo publicar esta PWA en GitHub Pages desde esta carpeta.
```

**Paso 18 — atención, esto importa.** Los datos viven en el navegador del
celular, atados a la dirección web. **Si más adelante cambiás de dirección,
perdés todo lo cargado.** Elegí la URL definitiva ahora, antes de cargar el
primer pedido real.

**Paso 19.** Desde el celular, abrí la dirección en Chrome y usá "Agregar a
pantalla de inicio". Ahí queda como una app más.

---

## Fase 7 — Puesta en marcha

**Paso 20.** Importá la planilla desde la app.

**Paso 21.** Revisá los dos registros marcados: *Bolsa gruesa* y *Caja
exagonal*, y corregí sus costos.

**Paso 22.** Antes de usarla en serio, tomá dos o tres pedidos de prueba con
seña incluida y borralos. Es donde vas a descubrir lo que falta.

**Paso 23.** Exportá el respaldo JSON y guardalo en Drive. Repetilo una vez por
semana. Es un archivo: si se rompe el celular, sin respaldo perdiste todo.

---

## Cómo trabajar con Claude Code sin frustrarte

| Situación | Qué hacer |
|---|---|
| Se fue por las ramas o rompió algo | `git checkout .` y volvé a pedirlo con más precisión. No discutas con él veinte mensajes |
| Propone algo que no está en la especificación | "Eso no está en ESPECIFICACION.md. Limitate a lo especificado." |
| Quiere empezar por la interfaz o el importador | Frenalo. El orden es motor → tests → interfaz → importador |
| La sesión se puso larga y empieza a olvidar | Cerrala y abrí una nueva. `CLAUDE.md` le devuelve el contexto |
| Cambio de arquitectura o algo que no entendés | Pasá a Opus para ese mensaje |
| Trabajo diario, pantallas, ajustes | Sonnet alcanza y rinde más |

**Dos reglas de oro:**

1. **Nunca aceptes "listo" sin ver el test en verde.** Si dice que funciona,
   pedile que ejecute la prueba y te muestre la salida.
2. **Commit después de cada fase.** Es la diferencia entre perder diez minutos
   y perder un día.

---

## Resumen del orden

| Fase | Qué sale | Cuándo commitear |
|---|---|---|
| 0 | Carpeta con los cinco archivos, git iniciado | Al terminar |
| 1 | `CLAUDE.md` y las dudas resueltas | Al terminar |
| 2 | Motor + tests en verde | **Imprescindible** |
| 3 | Base de datos + tokens de estilo | Al terminar |
| 4 | Diez pantallas, de a una | Cada dos o tres |
| 5 | Importador y Excel | Al terminar |
| 6 | PWA publicada e instalada | Al terminar |
| 7 | Datos reales cargados y revisados | Respaldo semanal |
