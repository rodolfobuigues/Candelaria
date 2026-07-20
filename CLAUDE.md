# Candelaria — reglas invariantes

App de costeo, precios y pedidos para reemplazar la planilla
`Velas_y_adornos_Candelaria_18-7-26.xlsx`. Fuente de verdad funcional:
`ESPECIFICACION.md`. Fuente de verdad visual: `DISENO.md` (ante diferencia,
manda la especificación).

## Stack y restricciones duras

- **PWA instalable, offline-first. Sin backend, sin servicios pagos, sin
  nube, sin cuentas de usuario.**
- Persistencia local en **IndexedDB**. Todo el motor de cálculo vive en
  funciones puras, en un módulo sin dependencias de la interfaz ni de la
  base de datos (testeable contra las fixtures).
- Único respaldo real: exportación/importación de un archivo JSON completo.
  Excel es un mecanismo aparte, no intercambiable con el JSON (ver
  ESPECIFICACION.md § 5.6).
- SheetJS **empaquetado en la app**, nunca desde CDN.
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

- **Ningún archivo fuera de `src/estilos/tokens.css` puede contener un
  valor literal de color (hex, `rgb(`), radio de borde, sombra o
  espaciado.** `src/estilos/componentes.css` solo consume variables de
  `tokens.css`.
- Debe existir un test automatizado que recorra el código y falle ante
  cualquier violación (ESPECIFICACION.md § 6, DISEÑO.md § 10.1).
- Valores iniciales de parámetros globales van en
  `src/config/parametros.js`, no hardcodeados en el motor ni la UI.

## Orden de trabajo obligatorio

1. **Motor de costeo** (funciones puras, sin UI ni DB).
2. **Tests verdes** contra `fixtures_insumos.csv`, `fixtures_productos.csv`
   y `fixtures_combos.json` (tolerancia 0,01). No se considera terminado
   el motor hasta que estos tests pasen.
3. **Interfaz** (pantallas de ESPECIFICACION.md § 5 y DISEÑO.md § 8).
4. **Importador** de la planilla original (ESPECIFICACION.md § 7) — es lo
   último, no lo primero: depende del motor y del modelo ya validados.

No adelantar interfaz ni importador antes de que el motor tenga sus tests
en verde.

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
