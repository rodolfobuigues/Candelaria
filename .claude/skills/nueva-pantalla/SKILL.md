---
name: nueva-pantalla
description: Implementa una pantalla de la interfaz de Candelaria siguiendo DISENO.md § 8 y § 5 (regla de números). Usar para cada una de las doce pantallas de la Fase 4, una por vez.
argument-hint: [productos|ficha-producto|vender|pedido|mensaje|registro-pago|pedidos|insumo|producto-editar|combo-editar|ajustes|editor-plantillas]
---

Construís **una sola pantalla** por invocación de esta skill — nunca varias
juntas. `PASO_A_PASO.md`: *"No le pidas las diez juntas: se le mezclan los
criterios y terminás revisando todo de nuevo."*

## 0. Requisitos previos

Esta skill **no crea cimientos**. Si falta cualquiera de estos archivos,
frená y avisá que el paso 11b no está terminado:

- `src/config/formato.js` — moneda, miles, decimales, fechas.
- `src/persistencia/catalogoRepo.js` — catálogo con costo y precio derivados.
- `src/desarrollo/siembra.js` — carga las fixtures para poder ver pantallas
  antes de que exista el importador.
- `src/interfaz/App.jsx` y `src/interfaz/enrutador.js` — armazón y barra
  inferior.

La estructura de carpetas está fijada y **no se decide acá**:

```
src/interfaz/App.jsx
src/interfaz/enrutador.js
src/interfaz/comun/                       BarraInferior, Encabezado, Aviso...
src/interfaz/pantallas/<Pantalla>/<Pantalla>.jsx
```

Si la carpeta no existe, la skill falla y lo informa. No inventa una
convención nueva ni introduce un segundo patrón a mitad de la Fase 4.

## 1. Ubicar la pantalla

| Argumento | DISENO.md | ESPECIFICACION.md |
|---|---|---|
| `productos` | § 8.5 Productos (tres solapas) | § 5.2 |
| `ficha-producto` | § 8.6 Ficha de producto | § 5.2 |
| `vender` | § 8.1 Vender | § 5.3 |
| `pedido` | § 8.2 Pedido (alta y ficha, dos estados) | § 5.4 |
| `mensaje` | § 8.3 Mensaje generado | § 5.4.1 |
| `registro-pago` | § 8.11 | § 5.4 punto 3 y § 3.5.2 |
| `pedidos` | § 8.4 Pedidos | § 5.4 |
| `insumo` | § 8.7 (alta) y § 8.11 (edición y listado) | § 5.1 |
| `producto-editar` | § 8.11 (alta y edición con receta) | § 5.2 |
| `combo-editar` | § 8.11 (alta y edición de combo) | § 5.2 |
| `ajustes` | § 8.8 Ajustes | § 5.5, § 5.6 |
| `editor-plantillas` | § 8.9 Editor de plantillas | § 3.6 |

**`revisar-importacion` (§ 8.10) no es de esta fase.** Se construye en la
Fase 5, junto al importador que le da forma a los datos que muestra.

Para las pantallas de § 8.11 no hay referencia visual: se resuelven aplicando
§ 1, § 5, § 6 y § 7 directamente.

Leé **solo** la subsección correspondiente de cada documento, más las
transversales que aplican siempre: § 1 (reglas duras), § 5 (regla de números
y desbordes), § 6 (definición de cada componente) y § 7 (estructura común).
No hace falta releer el documento entero en cada invocación.

## 2. Antes de escribir código

- Revisá si `tokens.css` y `componentes.css` ya cubren lo que la pantalla
  necesita. Si falta un componente de § 6 que otra pantalla también va a
  necesitar, agregalo a `componentes.css` primero — nunca con un estilo
  inline ni un valor suelto.
- Seguí exactamente la convención de las pantallas ya construidas.

## 3. Construir

**Reglas de la interfaz** (ESPECIFICACION § 2, CLAUDE.md):

- Preact con JSX. Hooks desde `preact/hooks`, no desde `preact`.
- En campos de formulario el evento en vivo es `onInput`, **no** `onChange`.
- Enrutado por hash, sobre el enrutador propio. Nunca History API.
- Sin librería de estado: `Context` para parámetros y catálogo, `useState`
  para el resto.
- Prohibido Tailwind, styled-components, emotion y cualquier CSS-in-JS.
- Prohibido `style={{ ... }}` con valores literales. Solo se admite para
  asignar variables CSS: `style={{ '--x': valor }}`.
- Ninguna dependencia nueva sin autorización explícita del dueño.

**Reglas de estilo:**

- Ningún color, radio, sombra o espaciado literal: solo clases de
  `componentes.css` o `var(--...)` de `tokens.css`. Si `tokens-guard.cjs` te
  bloquea, hay que agregar el token o la clase, nunca esquivarlo.
- Regla de números de § 5 sin excepción: bloque de importe con ancho fijo y
  `white-space: nowrap`, nombre truncado a dos líneas, 96 px de relleno
  inferior en las listas, cifras tabulares en toda columna numérica.
- Toda superficie interactiva, 48 × 48 px reales (`var(--toque-min)`).
- Todo importe pasa por `src/config/formato.js`. Nunca formateado a mano.
- Repasá qué se conserva y qué se descarta de la captura de referencia: cada
  subsección de § 8 lo dice para esa pantalla. No copies un elemento que la
  subsección pide descartar (menú hamburguesa, avatar, modo oscuro,
  taxonomías inventadas, botón de WhatsApp antes de guardar, etc.).

## 4. Verificar

- `npm test` en verde.
- Levantá la app **con el catálogo sembrado** por `siembra.js` — en Fase 4 no
  existe todavía el importador, así que "catálogo real" significa las
  fixtures cargadas por la siembra.
- Con Playwright, a 360 px de ancho: ningún importe partido en dos líneas
  —incluido el nombre más largo del catálogo, *"Bolsa organza 9x12
  comunion"*, con un importe de seis dígitos—, ninguna superficie interactiva
  menor a 48 × 48 px medida sobre el elemento renderizado, y 96 px de relleno
  inferior en las listas. Si Playwright no está disponible, decilo
  explícitamente y pedí revisión manual en el celular; **no des el punto por
  verificado**.
- El contraste no se recalcula acá: lo cubre `src/estilos/contraste.test.js`.
  Si la pantalla introduce un par (fondo, texto) que ese test no contempla,
  agregalo al test, no lo verifiques a ojo.
- Invocá al agente `revisor-diseno` antes de dar la pantalla por terminada.
