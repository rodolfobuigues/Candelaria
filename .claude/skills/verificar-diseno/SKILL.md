---
name: verificar-diseno
description: Corre las verificaciones de DISEÑO.md § 10 que todavía no están automatizadas en la suite (modo oscuro, superficies mínimas, contraste). Usar después de terminar una pantalla o antes de cerrar la Fase 4.
---

`DISEÑO.md § 10` lista seis verificaciones automatizables. Las dos primeras
ya corren solas en `src/estilos/guardaLiterales.test.js` (literales fuera de
tokens.css, fuentes remotas) — no hace falta repetirlas acá. Esta skill cubre
las cuatro restantes, en el orden en que se pueden chequear sin navegador
primero:

## 1. Ausencia de modo oscuro

Buscá en todo el repo (fuera de `node_modules`, `dist`, `coverage`) las
cadenas `modo oscuro` y `prefers-color-scheme`, y cualquier variante de
interruptor de tema (`darkMode`, `theme-toggle`, `dark-mode`, etc.). CLAUDE.md
y DISEÑO.md § 1 son explícitos: **un solo tema claro, sin interruptor**.
Cualquier coincidencia fuera de la prosa de los propios `.md` de
especificación es una violación.

## 2. Contraste 4,5:1 en texto menor a 24 px

Los colores son fijos — están en `src/estilos/tokens.css` — así que el
contraste se puede calcular sin renderizar nada:

1. Tomá los pares (fondo, texto) que la app usa en la práctica: la tabla de
   "Reglas de uso" de DISEÑO.md § 2, más cada combinación de
   `src/estilos/componentes.css` que fije `background` y `color` juntos
   (`.etiqueta-estado--*`, `.chip-filtro[aria-pressed]`, `.aviso`,
   `.barra-inferior a[aria-current]`, etc.).
2. Para cada par, calculá el contraste con la fórmula estándar WCAG
   (luminancia relativa por canal sRGB, `(L1 + 0.05) / (L2 + 0.05)`).
3. Si el texto de ese par se usa en `--texto-etiqueta`, `--texto-cuerpo`,
   `--texto-cuerpo-s` o cualquier tamaño menor a 24 px, exigí ≥ 4,5:1. Para
   texto grande (`--texto-display`, `--texto-titulo-*`, `--texto-precio-l`)
   alcanza 3:1.
4. Reportá cualquier par que no llegue, con su contraste real. DISEÑO.md § 2
   ya advierte que **el dorado (`--color-gold`) nunca va como texto sobre
   fondo claro** — si aparece en un `color:`, es una violación directa sin
   necesidad de calcular nada.

## 3. Superficies interactivas ≥ 48 × 48 px

Grep sobre `src/estilos/componentes.css` y cualquier estilo inline que
hubiera quedado: todo elemento con `cursor: pointer`, todo `button`, `a`
dentro de `.barra-inferior`, `.chip-filtro`, `.chip-seleccion`, los botones
del `.selector-cantidad` y el `.boton-flotante` tienen que medir
`var(--toque-min)` (48 px) o `var(--fab)` (56 px) en alto y ancho reales, no
solo de "área tocable" con padding. Si alguno usa un valor menor, es una
violación de DISEÑO.md § 1.7.

## 4. Importes sin partir e íconos correctos

Esto sí necesita navegador — no se puede verificar leyendo el CSS.

- Si Playwright MCP está disponible: levantá la app, navegá a cada pantalla
  construida, achicá el viewport a 360 px de ancho, cargá el producto con el
  nombre más largo del catálogo real (*"Bolsa organza 9x12 comunion"*, ver
  `fixtures_productos.csv`) y un importe de seis dígitos, y confirmá que
  ningún importe se parte en dos líneas (prueba de aceptación explícita de
  § 5).
- Si no está disponible, decíselo al usuario explícitamente y pedile que lo
  revise a mano en el celular — no des este punto por verificado sin haberlo
  visto.

## Reporte

Terminá con una lista corta: qué pasó, qué no, y el archivo/línea de cada
violación encontrada. No marques un punto como verificado si no pudiste
correr el chequeo correspondiente (por ejemplo, el punto 4 sin Playwright).
