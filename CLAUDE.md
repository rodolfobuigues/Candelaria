# Candelaria — reglas invariantes

App de costeo, precios y pedidos para reemplazar la planilla
`Velas y adornos Candelaria 18-8-26.xlsx`. Fuente de verdad funcional:
`ESPECIFICACION.md`. Fuente de verdad visual: `DISENO.md` (ante diferencia,
manda la especificación).

## Quién puede tocar cada documento

- **`ESTADO.md`** se puede actualizar por cuenta propia al cerrar cada fase
  (o un paso relevante dentro de una fase): estado de las fases, qué está
  construido, decisiones tomadas, pendientes.
- **`ESPECIFICACION.md` y `DISEÑO.md` no se tocan sin que el dueño lo pida
  explícitamente.** Son las fuentes de verdad funcional y visual; un cambio
  no pedido en cualquiera de las dos se replica en todo lo que se construya
  después.

## Stack y restricciones duras

- **PWA instalable, offline-first. Sin backend, sin servicios pagos, sin
  nube, sin cuentas de usuario.**
- Persistencia local en **IndexedDB**. Todo el motor de cálculo vive en
  funciones puras, en un módulo sin dependencias de la interfaz ni de la
  base de datos (testeable contra las fixtures).
- **Interfaz: Preact con JSX sobre Vite. JavaScript, sin TypeScript.**
  Enrutado por hash escrito a mano (`hashchange`), sin librería de enrutado
  ni History API. Sin librería de estado: `Context` para parámetros globales
  y catálogo, `useState` para el resto. Ninguna dependencia nueva sin
  autorización explícita del dueño.
- **Host: GitHub Pages**, repositorio `candelaria`, `base: '/candelaria/'`
  en Vite. IndexedDB se aísla por origen: cambiar de host pierde los datos
  salvo respaldo JSON (ver ESPECIFICACION.md § 2).
- Único respaldo real: exportación/importación de un archivo JSON completo.
  Excel es un mecanismo aparte, no intercambiable con el JSON (ver
  ESPECIFICACION.md § 5.6).
- Excel: **ExcelJS empaquetado en la app**, nunca desde CDN. Se descarta
  SheetJS: su versión gratuita no sombrea celdas ni oculta columnas, ambas
  exigidas por § 5.6.
- **Ninguna fuente remota.** Tipografías (EB Garamond, Plus Jakarta Sans)
  empaquetadas localmente. Nunca Google Fonts ni ningún CDN.
- **Un solo tema claro.** No hay modo oscuro, no hay `prefers-color-scheme`,
  no hay interruptor de tema.
- Navegación única: barra inferior de cuatro pestañas (**Vender · Pedidos ·
  Productos · Ajustes**). Insumos no tiene pestaña propia: vive como solapa
  dentro de Productos (Productos · Combos · Insumos). Nunca menú hamburguesa.

## Idioma y formato

- Toda la interfaz en **español rioplatense**.
- Moneda: **pesos argentinos**. Formato obligatorio y único:
  `$ 10.395` — punto de miles, coma decimal, espacio duro entre el símbolo
  y el número.
- Importes de catálogo y pedidos: **sin decimales**. Desglose de receta y
  costo unitario de insumo: **dos decimales**.
- Cifras tabulares (`font-variant-numeric: tabular-nums`) en toda columna
  numérica. Ningún importe se parte en dos líneas.
- Config de formato centralizada en `src/config/formato.js` (moneda,
  miles, decimales, fechas).

## Prohibición de literales fuera de tokens.css

Regla completa en ESPECIFICACION.md § 6.2. Resumen operativo:

- **Ningún archivo fuera de `src/estilos/tokens.css` puede contener un
  valor literal de color (hex, `rgb(`), radio de borde, sombra o
  espaciado, ni una referencia a fuente remota.** `src/estilos/componentes.css`
  solo consume variables de `tokens.css`.
- Prohibido además en la interfaz: Tailwind, styled-components, emotion,
  cualquier CSS-in-JS, y `style={{ ... }}` con valores literales en JSX
  (solo se admite para asignar variables CSS).
- **Una sola implementación de la regla**, en `src/estilos/guardaLiterales.cjs`.
  La consumen el hook `.claude/hooks/tokens-guard.cjs` y la suite de tests;
  ningún consumidor tiene su propia expresión regular.
- **Lista blanca cerrada y congelada**, con el motivo de cada entrada
  documentado en ESPECIFICACION.md § 6.2. Ampliarla requiere autorización
  explícita del dueño; un test de contrato falla ante cualquier agregado,
  quite o modificación.
- **El hook falla cerrado**: si el guardián no carga o tira excepción, la
  edición se bloquea. Cuatro tests obligatorios: contrato de la lista
  blanca, exención efectiva, regla efectiva y falla cerrada.
- Valores iniciales de parámetros globales van en
  `src/config/parametros.js`, no hardcodeados en el motor ni la UI.

## Orden de trabajo obligatorio

1. **Motor de costeo** (funciones puras, sin UI ni DB).
   Tests verdes contra `fixtures_insumos.csv`, `fixtures_productos.csv`
   y `fixtures_combos.json` (tolerancia 0,01). No se considera terminado
   el motor hasta que estos tests pasen.
2. **Persistencia** (IndexedDB, ESPECIFICACION.md § 3): esquema y CRUD de
   insumos, productos, combos, parámetros y pedidos; lógica pura de pagos
   e historial de pedido (funciones puras, fecha por parámetro); exportación
   e importación del respaldo JSON completo.
3. **Tokens y estilos** (ESPECIFICACION.md § 6, DISEÑO.md § 10.1):
   `tokens.css`, `componentes.css` y el test que falla ante cualquier
   literal fuera de `tokens.css`.
4. **Interfaz** (pantallas de ESPECIFICACION.md § 5 y DISEÑO.md § 8).
5. **Importador** de la planilla original (ESPECIFICACION.md § 7) — es lo
   último, no lo primero: depende del motor y del modelo ya validados.

No adelantar una etapa antes de que la anterior tenga sus tests en verde.

El criterio objetivo completo son **25 puntos numerados** en
ESPECIFICACION.md § 8 (motor y datos, Excel, pedidos, mensajes, estilos e
interfaz, PWA). No se considera terminada una etapa mientras alguno de los
puntos que le corresponden siga en rojo o sin verificar.

## Otras reglas que no se deben perder de vista

- Baja de insumo/producto/combo = `activo = false`. Nunca borrado físico.
- Un pago registrado no se edita, se anula (queda visible, tachado).
- Los pedidos ya guardados **no** se recalculan al cambiar parámetros
  globales; los precios de línea quedan congelados (`precioOriginal`).
- La nota interna del pedido nunca sale en un mensaje al cliente; no existe
  marcador `{nota}`.
- Toda superficie interactiva mide al menos 48 × 48 px.
- La pantalla de Vender y la ficha de Pedido son **la misma pantalla con dos
  estados**: sin guardar solo muestra "Guardar"; una vez guardado aparecen
  pagos, historial y las acciones "Registrar pago" / "Marcar entregado" /
  "Copiar mensaje" / "Abrir WhatsApp".
- Productos `REPOSICION` usan prefijo de código `RP` (no `R`, reservado a
  recipientes). El importador debe renombrar los `R150`/`R50`/`R170` de la
  planilla a `RP150`/`RP50`/`RP170` y marcarlos para revisión.
