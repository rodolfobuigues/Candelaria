---
name: nueva-pantalla
description: Implementa o revisa una pantalla de la interfaz de Candelaria siguiendo DISEÑO.md § 8 y § 5 (regla de números). Usar para cada una de las diez pantallas de la Fase 4, una por vez.
argument-hint: [vender|pedido|mensaje|pedidos|productos|ficha-producto|nuevo-insumo|ajustes|editor-plantillas|revisar-importacion]
---

Construís **una sola pantalla** por invocación de esta skill — nunca varias
juntas. `PASO_A_PASO.md`: *"No le pidas las diez juntas: se le mezclan los
criterios y terminás revisando todo de nuevo."*

## 1. Ubicar la pantalla

El argumento indica cuál. Mapeo a las subsecciones de `DISEÑO.md § 8` y
`ESPECIFICACION.md § 5`:

| Argumento | DISEÑO.md | ESPECIFICACION.md |
|---|---|---|
| `vender` | § 8.1 Vender | § 5.3 |
| `pedido` | § 8.2 Pedido | § 5.4 |
| `mensaje` | § 8.3 Mensaje generado | § 5.4.1 |
| `pedidos` | § 8.4 Pedidos | § 5.4 |
| `productos` | § 8.5 Productos | § 5.2 |
| `ficha-producto` | § 8.6 Ficha de producto | § 5.2 |
| `nuevo-insumo` | § 8.7 Nuevo insumo | § 5.1 |
| `ajustes` | § 8.8 Ajustes | § 5.5, § 5.6 |
| `editor-plantillas` | § 8.9 Editor de plantillas | § 3.6 |
| `revisar-importacion` | § 8.10 Revisar importación | § 7 |

Si el argumento no está en la tabla, es una de las "pantallas faltantes" de
§ 8.11 (alta/edición de producto y combo, listado y ficha de insumo,
formulario de pago): no hay referencia visual, se resuelve aplicando las
reglas generales de § 1, § 5, § 6 y § 7 directamente.

Leé **solo** la subsección correspondiente de cada documento, más las
secciones transversales que aplican siempre: § 1 (reglas duras), § 5 (regla
de números y desbordes), § 6 (definición de cada componente) y § 7
(estructura común de encabezado/contenido/barra inferior). No hace falta
releer el documento entero en cada invocación.

## 2. Antes de escribir código

- Revisá si `src/estilos/tokens.css` y `src/estilos/componentes.css` ya
  cubren todo lo que la pantalla necesita. Si falta un componente de § 6 que
  otra pantalla ya va a necesitar también, agregalo a `componentes.css`
  primero — no lo resuelvas con un estilo inline ni un valor suelto.
- Si es la primera pantalla que se construye, no hay convención de carpeta
  todavía: creá `src/interfaz/` y decidí ahí la estructura mínima (punto de
  entrada, cómo se cargan `tokens.css`/`componentes.css`, cómo se monta cada
  pantalla). Documentá esa decisión en una línea de comentario donde
  corresponda; no hace falta un documento aparte.
- Si ya hay pantallas construidas, seguí exactamente su misma convención.
  No introduzcas un segundo patrón de organización a mitad de la Fase 4.

## 3. Construir

- Ningún color, radio, sombra o espaciado literal: solo clases de
  `componentes.css` o `var(--...)` de `tokens.css`. El hook
  `tokens-guard.cjs` bloquea la edición si se te escapa uno — si te bloquea,
  es que hay que agregar el token o la clase, no esquivarlo.
- Aplicá la regla de números de § 5 sin excepción: bloque de importe con
  ancho fijo y `white-space: nowrap` (clases `.importe`/`.importe-l`),
  nombre truncado a dos líneas (`.nombre-truncado`), 96 px de relleno
  inferior en listas (`.lista`), cifras tabulares en toda columna numérica.
- Toda superficie interactiva, 48 × 48 px como mínimo (`var(--toque-min)`).
- Repasá qué se conserva y qué se descarta de la captura de referencia: cada
  subsección de § 8 lo dice explícitamente para esa pantalla puntual. No
  copies un elemento de la referencia que la subsección pide descartar (menú
  hamburguesa, avatar, modo oscuro, taxonomías inventadas, etc.).
- Formato de moneda y decimales: `src/config/formato.js` si ya existe: si no
  existe todavía, es señal de que hay que crearlo antes de mostrar el primer
  importe (CLAUDE.md exige que el formato esté centralizado ahí, nunca
  hardcodeado en la pantalla).

## 4. Verificar

- `npm test` en verde (el hook `suite-tests.cjs` ya lo corre solo al guardar,
  pero confirmalo antes de dar la pantalla por terminada).
- Probá la pantalla en el navegador — no la des por terminada solo porque
  compila. Si Playwright MCP está disponible, usalo para levantar la app y
  ejercitar el camino dorado de la pantalla; si no, levantá el servidor local
  y mostrale al usuario cómo abrirla.
- Si la pantalla tiene texto menor a 24 px, verificá el contraste contra su
  fondo (4,5:1). La skill `verificar-diseno` automatiza esta cuenta para los
  pares de tokens ya definidos.
- Si el nombre más largo del catálogo real (*"Bolsa organza 9x12 comunion"*)
  o un importe de seis dígitos rompen el layout a 360 px de ancho, no está
  terminada: es la prueba de aceptación explícita de § 5.
