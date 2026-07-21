---
name: verificar-diseno
description: Corre las verificaciones de DISENO.md § 10 que no están cubiertas por la suite de tests (ausencia de modo oscuro, superficies mínimas y desbordes medidos en navegador). Usar después de terminar una pantalla o antes de cerrar la Fase 4.
---

`DISENO.md § 10` lista seis verificaciones. **Tres ya corren solas en la
suite y no se repiten acá:**

| Verificación | Dónde corre |
|---|---|
| § 10.1 — literales fuera de `tokens.css` | `src/estilos/guardaLiterales.test.js` |
| § 10.2 — fuentes remotas | `src/estilos/guardaLiterales.test.js` |
| § 10.5 — contraste 4,5:1 | `src/estilos/contraste.test.js` |

**No recalcules el contraste a mano.** La regla tiene una sola
implementación, igual que el guardián de literales. Si una pantalla usa un
par (fondo, texto) que el test no contempla, se agrega al test; no se
verifica por fuera.

Esta skill cubre las tres restantes.

## 1. Ausencia de modo oscuro — § 10.3

Buscá en todo el repo (fuera de `node_modules`, `dist`, `coverage`) las
cadenas `modo oscuro`, `prefers-color-scheme`, `darkMode`, `theme-toggle`,
`dark-mode` y cualquier variante de interruptor de tema. DISENO § 1 y
CLAUDE.md son explícitos: **un solo tema claro, sin interruptor.** Cualquier
coincidencia fuera de la prosa de los propios `.md` de especificación es una
violación.

## 2. Superficies interactivas ≥ 48 × 48 px — § 10.4

**Se mide en navegador, no con grep.** Que `componentes.css` declare
`var(--toque-min)` no prueba que el botón mida 48 px renderizado: un
contenedor `flex` puede comprimirlo, un `padding` heredado puede reducir el
área real, y nada de eso aparece en el CSS. Verificarlo leyendo hojas de
estilo es el mismo error que verificarlo en jsdom.

- **Pre-chequeo con grep** (barato, no concluyente): sobre
  `componentes.css`, confirmá que `.boton`, `.chip-filtro`, `.chip-seleccion`,
  los botones del `.selector-cantidad`, `.barra-inferior a` y
  `.boton-flotante` declaran `var(--toque-min)` o `var(--fab)`. Si alguno
  declara un valor menor, ya es violación y no hace falta seguir.
- **Veredicto con Playwright**: levantá la app a 360 px de ancho y medí con
  `getBoundingClientRect()` cada elemento interactivo de la pantalla
  —`button`, `a`, `input`, `[role="button"]`, todo lo que tenga
  `cursor: pointer`—. Reportá los que midan menos de 48 en cualquiera de las
  dos dimensiones, con su selector y sus medidas reales.

## 3. Desbordes y relleno inferior — § 10.6 y § 5

También necesita navegador.

- A 360 px de ancho, con el catálogo sembrado: **ningún importe partido en
  dos líneas.** El caso de prueba obligatorio es el nombre más largo del
  catálogo, *"Bolsa organza 9x12 comunion"* (ver `fixtures_productos.csv`),
  con un importe de seis dígitos.
- **96 px de relleno inferior en toda lista** (`--relleno-lista-inferior`):
  comprobá que el último elemento quede completamente visible con la barra
  flotante del carrito o el botón flotante presentes, no solo que la regla
  CSS esté escrita.
- El nombre se trunca a dos líneas con puntos suspensivos, nunca más.

Si Playwright no está disponible, **decíselo al usuario explícitamente y
pedile que lo revise a mano en el celular.** No des estos puntos por
verificados sin haberlos visto.

## Nota sobre umbrales de contraste

`contraste.test.js` exige 4,5:1 a todo texto menor a 24 px, que es lo que
dice DISENO § 2. Para texto de 24 px o más, WCAG admite 3:1; esa relajación
es una **derivación de WCAG, no algo que DISENO declare**, y solo aplica a
`--texto-display`, `--texto-titulo-l`, `--texto-titulo-m` y
`--texto-precio-l`. No aplica a `--texto-etiqueta` (12 px), `--texto-precio`
(20 px), `--texto-seccion` (20 px), `--texto-cuerpo` ni `--texto-cuerpo-s`.
En particular, la píldora de pestaña activa está en 4,57:1 con texto de
12 px: el umbral que le corresponde es 4,5 y no se relaja.

## Reporte

Terminá con una lista corta: qué pasó, qué no, y el archivo o el selector de
cada violación, con las medidas reales cuando corresponda. **No marques un
punto como verificado si no pudiste correr el chequeo correspondiente.**
