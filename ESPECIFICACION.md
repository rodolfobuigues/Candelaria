# Candelaria — Especificación de la app de costeo, precios y pedidos

Documento de entrada para construir la aplicación. Reemplaza la planilla
`Velas_y_adornos_Candelaria_18-7-26.xlsx`.

**Idioma de toda la interfaz: español rioplatense. Moneda: pesos argentinos.
Formato numérico: separador de miles `.`, decimal `,`.**

*Actualizado: 20/07/2026 — incorpora las decisiones técnicas cerradas durante la
construcción (interfaz, host, librería de Excel, guardián de literales).*

---

## 1. Alcance

| Incluido | Excluido |
|---|---|
| Catálogo de insumos con costo derivado de la compra | Control de stock |
| Catálogo de productos con receta (BOM) | Órdenes de producción |
| Combos | Contabilidad, facturación, AFIP |
| Motor de costeo y precios | Múltiples usuarios o sincronización en la nube |
| Toma de pedidos, pagos parciales e historial | Pasarela de pagos |
| Importación única de la planilla actual | |
| Exportación e importación de respaldo JSON | |
| Exportación e importación de la base en Excel | |
| Borrado completo de la base desde Ajustes | Baja individual de pedidos |

## 2. Stack

- **PWA instalable**, offline-first. Sin backend, sin servicios pagos.
- Persistencia local en **IndexedDB**.
- **Interfaz: Preact con JSX sobre Vite. JavaScript, sin TypeScript.** API
  idéntica a React con 3 KB de runtime; reversible a React con un alias en
  `vite.config.js`. Los hooks se importan de `preact/hooks`. En campos de
  formulario, el evento en vivo es `onInput`, no `onChange`.
- **Enrutado por hash**, escrito a mano sobre `hashchange`. Sin librería de
  enrutado y sin History API: GitHub Pages no tiene fallback de SPA.
- **Sin librería de estado.** `Context` para parámetros globales y catálogo,
  `useState` para el resto.
- **Ninguna dependencia nueva sin autorización explícita del dueño.**
- Excel: **ExcelJS**, empaquetado (ver 5.6).
- **Dispositivo objetivo: Android / Chrome.** Ancho de referencia, 360 px.
- **Host: GitHub Pages**, repositorio `candelaria`, URL
  `https://<usuario>.github.io/candelaria/`, `base: '/candelaria/'` en Vite.
- Diseñada para uso en celular, en vertical, con una mano. Debe funcionar sin
  conexión de datos, porque se usa frente al cliente.
- Respaldo: exportación e importación de un único archivo JSON con toda la base.

**Advertencia de origen.** IndexedDB se aísla por **origen** (esquema + host +
puerto), no por ruta. Se puede mover el repositorio o la carpeta sin perder
datos; cambiar de host sí los pierde. La migración de host se resuelve con
exportar el respaldo JSON, instalar en el origen nuevo e importar. Un dominio
propio eliminaría el candado por completo y queda como opción abierta.

---

## 3. Modelo de datos

### 3.1 Insumo

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `codigo` | string | Único. **Siempre en mayúsculas.** Prefijos: `M` materiales, `A` accesorios, `E` empaque, `MO` mano de obra |
| `nombre` | string | |
| `categoria` | enum | `MATERIAL` \| `ACCESORIO` \| `EMPAQUE` \| `MANO_DE_OBRA` |
| `unidad` | enum | `g` \| `kg` \| `ml` \| `l` \| `unidad` \| `hora` |
| `montoCompra` | número | Lo que se pagó |
| `cantidadCompra` | número | Cuánto se compró, en `unidad` |
| `costoUnitario` | **derivado** | `montoCompra / cantidadCompra`. No se carga a mano |
| `activo` | booleano | Para dar de baja sin perder historial |

La carga es siempre **monto pagado + cantidad comprada**. Ejemplo: pagué 3.905
por 2 paquetes de 1.000 g de cera → monto 3.905, cantidad 2.000 g → 1,9525 $/g.

### 3.2 Producto

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `codigo` | string | Único, mayúsculas. `V` velas, `R` recipientes, `RP` reposiciones |
| `nombre` | string | |
| `categoria` | enum | `VELA` \| `RECIPIENTE` \| `REPOSICION` |
| `ceraAltoPF` | número | gramos |
| `ceraBajoPF` | número | gramos |
| `pabilo` | número | unidades, admite fracciones (0,5 = medio) |
| `yeso` | número | **gramos** (el insumo se guarda en $/kg; el motor divide por 1.000) |
| `minutosManoObra` | número | minutos |
| `recipienteCosto` | número | Costo del recipiente comprado. Se carga en el propio producto |
| `recipienteCantidad` | número | 0 o 1 |
| `heredaCostoDe` | id \| null | Ver 3.2.1 |
| `extras` | lista | Insumos adicionales: `{insumoId, cantidad}`. Ver 3.2.2 |
| `activo` | booleano | |

Los recipientes son productos vendibles con precio propio **y** referenciables
como componentes de un combo. No hay bandera que los distinga.

#### 3.2.1 Herencia de costo

Algunos productos comparten la misma pieza base que otro. Si `heredaCostoDe`
apunta a otro producto, `recipienteCosto` se toma del producto padre en tiempo
de cálculo, no se copia. Actualizar el padre actualiza a todos los hijos.
La cadena debe detectar ciclos y rechazarlos al guardar.

En la planilla actual esto existe como `=E59`, `=C55`, `=C79` en la columna C
de las filas 60, 61 y 80. La importación debe convertirlo en esta relación,
**leyendo las fórmulas de las celdas, no sus valores calculados.**

#### 3.2.2 Extras

La planilla actual no tiene esta capacidad: cada producto solo puede usar los
siete insumos fijos. `extras` permite agregar cualquier insumo a un producto.
Debe existir en el modelo y sumar a `Materiales`, aunque la importación no
genere ninguno.

### 3.3 Combo

| Campo | Tipo |
|---|---|
| `id` | string |
| `nombre` | string |
| `lineas` | lista de `{tipo: 'PRODUCTO'\|'INSUMO', refId, cantidad}` |
| `activo` | booleano |

### 3.4 Parámetros globales

Un único registro editable desde una pantalla de configuración.

| Parámetro | Valor inicial | Descripción |
|---|---|---|
| `beneficio` | 0,35 | Margen aplicado sobre el costo de producción |
| `factorGastos` | 1,07 | Gastos fijos y desperdicio, en un solo factor |
| `redondeo` | 100 | Múltiplo al que se redondea hacia arriba |
| `costoHoraManoObra` | 7.000 | $/hora |
| `porcentajeEsencia` | 7 | **Porcentaje en peso** sobre la cera total |
| `mlColorantePorGramoCera` | 0,00166667 | Constante por dilución. Se toma tal cual, no se descompone |
| `unidadesCocoPorGramoCera` | 0,0002 | |

Cambiar cualquiera recalcula **todos** los productos y combos. Cada cambio se
guarda con fecha y valor anterior, para poder explicar por qué subió un precio.
Los pedidos ya tomados **no** se recalculan (ver 5.3).

### 3.5 Pedido

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `numero` | entero | Correlativo |
| `fecha` | fecha | |
| `clienteNombre` | string | Obligatorio |
| `clienteTelefono` | string | Opcional. Habilita abrir WhatsApp |
| `notaInterna` | texto libre | Opcional. **Es privada: nunca sale en un mensaje al cliente** |
| `estadoEntrega` | enum | `PENDIENTE` \| `ENTREGADO` |
| `lineas` | lista | Ver 3.5.1 |
| `pagos` | lista | Ver 3.5.2 |
| `historial` | lista | Ver 3.5.3 |
| `total` | derivado | Suma de las líneas |
| `pagado` | derivado | Suma de los pagos |
| `saldo` | derivado | `total − pagado` |
| `estadoCobro` | derivado | Ver 3.5.2 |

**Los cuatro campos derivados no se persisten.** Se calculan en cada lectura;
la escritura los despoja aunque el objeto los traiga.

#### 3.5.1 Línea de pedido

| Campo | Notas |
|---|---|
| `tipo` | `PRODUCTO` \| `COMBO` |
| `refId` | |
| `nombreCongelado` | Copia del nombre al momento de tomar el pedido |
| `precioOriginal` | Precio de catálogo al momento de tomarlo. **Inmutable** |
| `precioAplicado` | Igual a `precioOriginal` salvo que se lo pise a mano |
| `cantidad` | |

Un pedido puede mezclar productos y combos.

#### 3.5.2 Pagos parciales

El estado de cobro **no se elige a mano: se deriva de los pagos registrados.**
Un pedido admite cualquier cantidad de pagos.

| Campo del pago | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `fecha` | fecha y hora | Editable: la seña puede haberse cobrado ayer |
| `monto` | número | Mayor a cero |
| `medio` | enum | `EFECTIVO` \| `TRANSFERENCIA` \| `OTRO` |
| `nota` | texto | Opcional |

Estado de cobro derivado:

| Condición | Estado |
|---|---|
| `pagado = 0` | `IMPAGO` |
| `0 < pagado < total` | `SEÑADO` |
| `pagado ≥ total` | `PAGADO` |

Reglas:

- Un pago no puede superar el saldo pendiente. Si el cliente paga de más, se
  registra el excedente en la nota y se avisa; no se guarda un saldo negativo.
- **Un pago registrado no se edita: se anula.** La anulación deja el pago
  visible, tachado, con su fecha y la fecha de anulación. La trazabilidad de
  plata cobrada no se borra nunca.
- Si se modifica el pedido después de cobrar una seña y el nuevo total queda por
  debajo de lo ya pagado, la app lo impide y explica por qué.

Los dos estados son independientes: se puede entregar sin cobrar y cobrar sin
entregar. El listado los muestra como dos etiquetas distintas.

#### 3.5.3 Historial de instancias

Registro **de solo agregado**: nunca se edita ni se borra. Cada movimiento
guarda fecha y hora, tipo y una descripción.

| Tipo de evento | Cuándo se registra |
|---|---|
| `CREADO` | Al guardar el pedido por primera vez |
| `MODIFICADO` | Al cambiar líneas, cantidades o precios. Describe qué cambió |
| `PAGO` | Al registrar un pago. Incluye monto, medio y saldo resultante |
| `PAGO_ANULADO` | Al anular un pago |
| `ENTREGADO` | Al marcar la entrega |
| `REABIERTO` | Al volver atrás un estado |
| `MENSAJE_GENERADO` | Al generar el texto de WhatsApp |

La ficha del pedido muestra este historial como línea de tiempo, del más
reciente al más antiguo, con la fecha de cada instancia a la vista: desde que se
tomó el pedido hasta el pago final.

### 3.6 Plantillas de mensaje

Editables desde la pantalla de configuración, en la misma sección que los
parámetros de cálculo. Se guardan como texto con marcadores que la app
reemplaza al generar el mensaje.

| Marcador | Reemplazo |
|---|---|
| `{cliente}` | Nombre del cliente |
| `{numero}` | Número de pedido |
| `{fecha}` | Fecha del pedido |
| `{detalle}` | Lista de líneas, una por renglón: cantidad, nombre e importe |
| `{total}` | Total del pedido |
| `{pagado}` | Total cobrado hasta el momento |
| `{saldo}` | Saldo pendiente |

**No existe un marcador para la nota del pedido.** La nota es interna, del
dueño, y no debe poder filtrarse a un mensaje ni por error. Si alguien escribe
`{nota}` en una plantilla, se trata como marcador inexistente.

**Supresión de líneas vacías:** si un renglón de la plantilla contiene
únicamente texto fijo y marcadores cuyos valores son cero o vacío, ese renglón
se omite del mensaje generado. Así una sola plantilla sirve para un pedido con
seña y para uno sin seña, sin mantener dos textos.

Tres plantillas, cada una con su valor inicial y un botón para restaurarlo:

**`confirmacion`** — valor inicial:

```
¡Hola {cliente}! Tu pedido #{numero} fue confirmado 🕯️

{detalle}

Total: {total}
Seña recibida: {pagado}
Saldo: {saldo}

¡Gracias por elegir Candelaria!
```

**`pago`** — valor inicial:

```
¡Hola {cliente}! Registré tu pago de {pagado} para el pedido #{numero}.
Saldo pendiente: {saldo}. ¡Gracias!
```

**`recordatorio`** — valor inicial:

```
¡Hola {cliente}! Te recuerdo que el pedido #{numero} tiene un saldo
pendiente de {saldo}. ¡Cualquier duda me escribís!
```

Reglas de la pantalla de edición:

- **Previsualización en vivo** con un pedido de ejemplo, debajo del campo de
  edición. Sin eso, el usuario no sabe qué está escribiendo.
- Lista de marcadores disponibles, tocable para insertarlos en el cursor.
- Si el texto contiene un marcador inexistente, se avisa al guardar y se
  muestra tal cual, sin reemplazar. Nunca se rompe el guardado.
- Los emojis y los saltos de línea se conservan.

---

## 4. Motor de cálculo

Debe implementarse como **funciones puras, en un módulo sin dependencias de la
interfaz ni de la base de datos**, para poder testearlo contra las fixtures.

### 4.1 Costo de un producto

```
ceraTotal      = ceraAltoPF + ceraBajoPF

// Insumos derivados: cero si no hay cera
esencia_g      = ceraTotal > 0 ? porcentajeEsencia / 100 * ceraTotal : 0
colorante_ml   = ceraTotal > 0 ? mlColorantePorGramoCera * ceraTotal : 0
coco_u         = ceraTotal > 0 ? unidadesCocoPorGramoCera * ceraTotal : 0

// Valorización — todo a COSTO UNITARIO del insumo, sin ningún factor
costoCeraAlto  = costoUnitario('CERA_ALTO_PF') * ceraAltoPF
costoCeraBajo  = costoUnitario('CERA_BAJO_PF') * ceraBajoPF
costoPabilo    = costoUnitario('PABILO')       * pabilo
costoRecipiente= recipienteCostoResuelto       * recipienteCantidad
costoYeso      = costoUnitario('YESO')         * yeso / 1000
costoEsencia   = costoUnitario('ESENCIA')      * esencia_g
costoColorante = costoUnitario('COLORANTE')    * colorante_ml
costoCoco      = costoUnitario('ACEITE_COCO')  * coco_u
costoExtras    = Σ (costoUnitario(extra) * cantidad)

manoObra       = costoHoraManoObra * minutosManoObra / 60

materiales     = costoCeraAlto + costoCeraBajo + costoPabilo + costoRecipiente
               + costoYeso + costoEsencia + costoColorante + costoCoco + costoExtras

subtotal       = materiales + manoObra

costoProduccion= techoMultiplo(subtotal * factorGastos, redondeo)
precio         = costoProduccion * (1 + beneficio)
```

`techoMultiplo(x, m) = ceil(x / m) * m`

**El precio de un producto NO se redondea después de aplicar el beneficio.**
Ejemplo verificado: subtotal 7.119,853 → costo 7.700 → precio 10.395.

### 4.2 Costo de un combo

```
para cada línea:
    si tipo = PRODUCTO → costoUnit = costoProduccion(producto)   // CON factorGastos
    si tipo = INSUMO   → costoUnit = costoUnitario(insumo)       // SIN factorGastos
    subtotalLinea = costoUnit * cantidad

costoCombo   = Σ subtotalLinea
precioCombo  = techoMultiplo(costoCombo * (1 + beneficio), redondeo)
```

**Dos asimetrías deliberadas respecto del cálculo de producto. Reproducirlas
exactamente, no "corregirlas":**

1. Los productos entran al combo con el factor de gastos ya aplicado; los
   insumos sueltos (accesorios, empaques) entran sin él. Confirmado por el
   dueño: el recipiente entra a costo de producción.
2. El precio del combo **sí** se redondea al múltiplo, a diferencia del precio
   de un producto.

Ejemplo verificado: 4.700 + 200 + 95,588 + 450 = 5.445,588 → 7.400.

### 4.3 Indicadores mostrados

| Indicador | Fórmula | Nota |
|---|---|---|
| Margen sobre costo | `precio / subtotal − 1` | ~0,45 |
| Peso de la mano de obra | `manoObra / subtotal` | |
| Beneficio bruto | `precio − materiales` | **No descuenta la mano de obra. Es intencional**, porque la mano de obra es propia |
| Beneficio neto | `precio − subtotal` | Mostrar al lado del anterior, para contraste |

---

## 5. Pantallas

Navegación inferior de cuatro accesos: **Vender · Pedidos · Productos · Ajustes**.

La pestaña **Productos** contiene un selector de tres solapas en la parte
superior: **Productos · Combos · Insumos**. Los insumos no tienen pestaña
propia: se llega a ellos desde ahí.

### 5.1 Insumos
Lista con buscador. Alta y edición con monto de compra y cantidad comprada; el
costo unitario se muestra calculado, en gris, no editable. Al guardar, avisar
cuántos productos cambian de precio.

### 5.2 Productos y combos
Lista agrupada por categoría, con precio visible. Ficha del producto con la
receta y el desglose de costo abierto: cada insumo, su cantidad, su costo, y los
totales de materiales, mano de obra, costo de producción y precio.

**Alta, edición, duplicado y baja son obligatorios en las tres entidades:
insumos, productos y combos.** La app tiene que poder operar años sin volver a
tocar la planilla ni el código.

| Acción | Comportamiento |
|---|---|
| Alta de producto | Código sugerido automáticamente (siguiente libre de la serie `V`/`R`), editable. Campos fijos de receta más `extras`. El costo y el precio se muestran en vivo mientras se cargan los valores |
| **Duplicar producto** | Copia la receta completa con código nuevo. Es la vía normal de alta: casi todo producto nuevo es una variante de otro |
| Alta de combo | Buscador para agregar líneas; cada línea puede ser producto o insumo. Costo y precio en vivo |
| Alta de insumo | Monto de compra y cantidad comprada; el costo unitario se muestra derivado |
| Baja | Marca `activo = false`. **Nunca borrado físico**, porque los pedidos y las recetas históricas lo referencian |
| Validación al guardar | Código único; no se puede desactivar un insumo o producto que esté en uso sin avisar en qué recetas aparece |

Un producto nuevo que no use cera funciona sin cambios: las cantidades derivadas
de esencia, colorante y aceite de coco se anulan solas cuando la cera es cero.
Cualquier material que no esté entre los casilleros fijos entra por `extras`.

### 5.3 Vender (pantalla principal)
Es la que se usa frente al cliente. Debe ser la más rápida.

1. Buscador de productos y combos, resultados con precio grande y legible.
2. Tocar agrega al pedido. El precio se **congela** en ese momento.
3. Cada línea permite editar cantidad y pisar el precio a mano. Si el precio
   aplicado difiere del original, mostrar ambos y la diferencia en pesos.
4. Total del pedido siempre visible.
5. Nombre y teléfono del cliente, y la nota interna del pedido (privada).
6. Guardar. **Guardar es confirmar: no hay un paso adicional.** El pedido nace
   con entrega `PENDIENTE` y cobro derivado de los pagos que se hayan cargado.
7. Al guardar, aparece de inmediato la tarjeta con el mensaje de confirmación
   ya armado y los botones "Copiar" y "Abrir WhatsApp" (ver 5.4.1).

### 5.4 Pedidos
Lista filtrable, con dos etiquetas por pedido: entrega y cobro. Filtros rápidos:
**"Con saldo" · "A entregar" · "Cerrados"**. Para los pedidos con
saldo, mostrar el saldo en lugar del total, que es el número que importa.

Ficha del pedido:

1. Cabecera con cliente, teléfono, total, pagado y **saldo destacado**.
2. Líneas del pedido.
3. Bloque **Pagos**: lista de pagos con fecha, monto y medio, y un botón
   "Registrar pago". El formulario propone el saldo completo como monto, para
   que cobrar el total sea un toque, y permite reducirlo para una seña.
4. Bloque **Historial**: línea de tiempo con la fecha y hora de cada instancia,
   de la más reciente a la más antigua.
5. Botones de acción: "Marcar entregado", "Copiar mensaje" y "Abrir WhatsApp".

**Alta y ficha son la misma pantalla, con dos estados.** Mientras el pedido no
está guardado, la única acción al pie es "Guardar". Una vez guardado, aparecen
los bloques de pagos e historial y el juego completo de acciones: "Registrar
pago", "Marcar entregado", "Copiar mensaje" y "Abrir WhatsApp". No se
construyen dos pantallas distintas.

Marcar la entrega y registrar un pago son acciones separadas. Se puede retroceder
la entrega; los pagos se anulan, no se retroceden.

**No hay baja individual de pedidos.** El numerador es correlativo y el
historial es de solo agregado. Las pruebas se limpian borrando toda la base
(ver 5.5).

### 5.4.1 Mensaje para WhatsApp

Al confirmar un pedido, la app arma el mensaje según la plantilla de la sección
3.6 y lo muestra en una tarjeta con dos botones: **"Copiar"** y **"Abrir
WhatsApp"**.

- "Copiar" deja el texto en el portapapeles y confirma con un aviso breve.
  Funciona siempre, aunque no haya teléfono cargado.
- "Abrir WhatsApp" arma el enlace con el número del cliente y el texto ya
  puesto. Si no hay teléfono cargado, el botón está deshabilitado y solo queda
  copiar.
- El mismo mecanismo aplica a los mensajes de pago y recordatorio, desde la
  ficha del pedido.
- Cada mensaje generado queda asentado en el historial.

`navigator.clipboard` exige contexto seguro: la prueba solo es válida sobre
HTTPS o `localhost`, nunca sobre `http://192.168.x.x`.

### 5.5 Ajustes
Parámetros globales (3.4), plantillas de mensaje (3.6), respaldo JSON,
exportación e importación en Excel (sección 5.6), importación de la planilla
original y **borrado completo de la base**.

El borrado completo pide confirmación escribiendo la palabra `BORRAR`, ofrece
exportar el respaldo JSON antes de ejecutarlo, y es la única forma de limpiar
datos de prueba antes de la puesta en marcha.

### 5.6 Exportación e importación en Excel

Son **dos mecanismos distintos y no intercambiables**. La app ofrece los dos.

| | Respaldo JSON | Excel |
|---|---|---|
| Para qué | Copia de seguridad | Trabajar los datos fuera de la app |
| Fidelidad | Total, incluidos ids e historial | Solo lo editable |
| Al importar | Reemplaza toda la base | Actualiza y agrega, previa confirmación |
| Uso típico | Cambio de celular, antes de un cambio grande | Actualizar 20 precios de compra de una vez |

#### Exportación

Un `.xlsx` con una hoja por entidad: `Insumos`, `Productos`, `Combos`,
`Pedidos`, `Parametros`.

- Cada fila arranca con la columna `id`, oculta o gris. **Es la clave de
  reconciliación al reimportar.**
- Las columnas derivadas (costo unitario, materiales, subtotal, costo de
  producción, precio, márgenes) se exportan **como valores, en columnas
  sombreadas y marcadas `[calculado]` en el encabezado**. Al importar se
  ignoran: se recalculan siempre desde el motor. Nunca hay dos fuentes de verdad.
- Nombres de columna en español, iguales a los rótulos de la app.
- `Pedidos` se exporta en cuatro hojas unidas por el número de pedido:
  `Pedidos` (cabecera, con total, pagado y saldo), `PedidosLineas`,
  `PedidosPagos` e `PedidosHistorial`. **Ninguna de las cuatro se reimporta.**
  Un pedido histórico no se edita en una planilla, y menos su historial.
- La hoja `Pedidos` se arma leyendo por el repositorio con derivados, nunca
  crudo sobre la tienda de pedidos: total, pagado y saldo no están persistidos.

#### Importación

Nunca sobrescribe en silencio. El flujo es obligatoriamente:

1. Elegir el archivo.
2. **Validar**: códigos duplicados, referencias a insumos o productos
   inexistentes, números negativos, unidades desconocidas, ciclos de herencia
   de costo. Si hay algún error, se aborta y se lista fila por fila con la hoja
   y el número de fila.
3. **Previsualizar**: cuántos registros se crean, cuántos se modifican y cuáles
   quedan igual. Para los modificados, mostrar el campo, el valor viejo y el
   nuevo. Debe indicar además **cuántos precios de venta cambian y cuál es la
   variación mayor**, porque es la consecuencia que importa.
4. Confirmar o cancelar.
5. Antes de aplicar, la app **guarda automáticamente un respaldo JSON** del
   estado previo, **descargado como archivo**, no solo retenido en memoria.

Reglas de reconciliación:

- Fila con `id` existente → actualiza ese registro.
- Fila con `id` vacío → alta, con código nuevo validado como único.
- Registro que está en la base pero **no** en el archivo → **no se toca**. La
  importación nunca borra. Las bajas se hacen desde la app.
- Los `id` que aparecen en el archivo y no existen en la base se rechazan como
  error, no se dan de alta.

#### Nota técnica

Usar **ExcelJS**, empaquetado en la app, **no desde un CDN**: la importación
tiene que funcionar sin conexión.

Se descarta SheetJS: su versión gratuita no permite sombrear celdas ni ocultar
columnas —ambas exigidas por esta sección— y su paquete de npm está congelado
en una versión vieja sin mantenimiento.

ExcelJS asume entorno Node: en el navegador hay que usar su build empaquetado o
proveer el polyfill de `Buffer`. **Verificarlo con la app compilada, no solo en
el servidor de desarrollo**, porque el fallo aparece en tiempo de ejecución.

Para importar la planilla original (sección 7), leer **las fórmulas** de las
celdas, no sus valores calculados: `heredaCostoDe` se deriva de `=E59`, `=C55`
y `=C79`, y `montoCompra`/`cantidadCompra` de las fórmulas de la columna C de
`Materia prima`.

---

## 6. Estilos centralizados

**Requisito explícito del dueño.** Debe poder cambiar colores y forma de los
botones tocando un solo archivo.

| Archivo | Contiene |
|---|---|
| `src/estilos/tokens.css` | Colores, radios, sombras, espaciados, tipografía, tamaños y `@font-face` locales, como variables CSS. Un solo tema claro; ver DISEÑO.md |
| `src/estilos/componentes.css` | Botón, tarjeta, input, lista, tabla. **Solo** consumen variables de `tokens.css` |
| `src/estilos/fuentes/` | Los `.woff2` empaquetados y sus licencias OFL |
| `src/config/formato.js` | Moneda, miles, decimales, fechas |
| `src/config/parametros.js` | Valores iniciales de la tabla 3.4 |

### 6.1 Tokens dimensionales

DISEÑO.md exige en prosa medidas que no declara como variables. Sin ellas,
`componentes.css` no se puede escribir sin violar la regla. Van en `tokens.css`:

| Token | Valor | Uso |
|---|---|---|
| `--borde-fino` | 1px | Contornos y separadores |
| `--icono` | 24px | Íconos de trazo |
| `--toque-min` | 48px | Alto de botón y campo, superficie mínima |
| `--alto-fila` | 64px | Fila de lista |
| `--fab` | 56px | Botón flotante |
| `--relleno-tarjeta` | 20px | Relleno interno de tarjeta |
| `--relleno-lista-inferior` | 96px | Para que la barra flotante no tape el último elemento |

### 6.2 Guardián de literales

**Regla verificable: ningún archivo fuera de `tokens.css` puede contener un
valor literal de color, radio de borde, sombra o espaciado, ni una referencia a
una fuente remota.**

- **Una sola implementación**, en `src/estilos/guardaLiterales.cjs`. La consumen
  el hook `.claude/hooks/tokens-guard.cjs` y la suite de tests. Ningún consumidor
  puede tener su propia expresión regular.
- **Extensiones revisadas:** `.css`, `.js`, `.jsx`, `.cjs`, `.mjs`, `.html`,
  `.svg`, `.json`. El barrido alcanza `.claude/hooks/` y `src/estilos/`.
- **Prohibiciones adicionales de la interfaz:** Tailwind, styled-components,
  emotion y cualquier CSS-in-JS; `style={{ ... }}` con valores literales en JSX
  —solo se admite para asignar variables CSS: `style={{ '--x': valor }}`.
- **El hook falla cerrado.** Si el módulo del guardián no carga o tira
  excepción, la edición se bloquea. Un guardián roto nunca permite escribir.
- **Lista blanca cerrada y congelada**, con el motivo de cada entrada:

| Grupo | Entradas | Motivo |
|---|---|---|
| `EXENTOS_COMPLETOS` | `src/estilos/tokens.css` | Es la fuente de verdad de los literales |
| | `src/estilos/guardaLiterales.cjs` | El detector contiene por fuerza las cadenas que detecta |
| | `src/estilos/guardaLiterales.fixtures.cjs` | Ejemplos de violación usados por sus tests |
| `EXENTOS_PARCIALES` | `manifest.json` → `theme_color`, `background_color` | Exigidos por la especificación de PWA |
| | `index.html` → `<meta name="theme-color">` | Ídem |
| `NO_ESCANEADOS` | `node_modules/`, `dist/`, `coverage/`, `.git/`, `src/estilos/fuentes/`, `package-lock.json` | Binarios o dependencias: la regla no aplica |

**Ampliar la lista blanca requiere autorización explícita del dueño.** Un test
de contrato compara la constante contra ese contenido exacto y falla ante
cualquier agregado, quite o modificación.

Tests obligatorios del guardián:

1. **Contrato**: la lista blanca es exactamente la acordada.
2. **Exención efectiva**: un literal en un archivo exento no dispara.
3. **Regla efectiva**: el mismo literal en un archivo no exento sí dispara.
4. **Falla cerrada**: con el guardián roto, el hook bloquea la edición.

**Advertencia de descubrimiento de tests.** `node --test` no escanea
directorios que empiezan con punto: un archivo `*.test.js` dentro de `.claude/`
nunca se ejecuta. Todo test vive bajo `src/`.

---

## 7. Importación de la planilla

Entrada: el `.xlsx` original. Se ejecuta una vez; después todo se carga en la app.

| Hoja | Destino | Reglas |
|---|---|---|
| `Materia prima` | Insumos | Filas 5–12 → `MATERIAL`, 25–29 → `ACCESORIO`, 32–43 → `EMPAQUE`, 51 → `MANO_DE_OBRA`. Son 26 insumos. La columna C trae el costo unitario ya calculado; derivar `montoCompra`/`cantidadCompra` de la fórmula cuando sea posible, si no, cargar monto = costo unitario y cantidad = 1 |
| `Costos` filas 4–34 | Productos `VELA` | |
| `Costos` filas 43–80 | Productos `RECIPIENTE` | |
| `Costos` filas 92–94 | Productos `REPOSICION` | La planilla los codifica `R150`, `R50`, `R170`, que se confunden con los recipientes. **El importador los renombra a `RP150`, `RP50`, `RP170`** y los deja anotados en el listado de revisión |
| `Combos` | Combos | Bloques de 13 filas |

Reglas de limpieza obligatorias:

1. **Leer las fórmulas de las celdas, no sus valores calculados.** Es lo que
   permite derivar la herencia de costo y las cantidades de compra.
2. **Códigos a mayúsculas.** La planilla mezcla `v26`, `r29`, `a4` con `V27`, `A1`.
3. **Descartar filas vacías** (35–41, 81–90) y los valores sueltos de `AD459:AD467`.
4. **Ignorar la columna F de `Materia prima`.** No la usa ninguna fórmula.
5. **Ignorar el bloque `Costos!AC120:AD146`.** Es un espejo de precios de combos
   con tres `#N/A`; en la app el combo se referencia por id.
6. **Convertir `C60`, `C61`, `C80`** en la relación `heredaCostoDe`.
7. **Ojo con la clave de búsqueda.** La planilla vincula producto e insumo por
   el **nombre** del insumo (`VLOOKUP` sobre la columna B de `Materia prima`),
   no por el código. Los nombres de los encabezados de `Costos` (fila 2) deben
   coincidir exactamente. En la app el vínculo pasa a ser por `id`.
   Nota: *Escencia* está escrito así en la planilla; corregirlo a *Esencia* en la
   app, pero el importador debe reconocer ambas grafías.
8. **Mapeo de categorías:** el rótulo de sección de la planilla se traduce —
   `VELAS` → `VELA`, `RECIPIENTES` → `RECIPIENTE`, `Reposicion Cera BPF` →
   `REPOSICION`.
9. **Marcar para revisión** el insumo *Bolsa gruesa*: su costo unitario calculado
   es 304,17 pero la planilla fuerza 1.500. Importar con 1.500 y dejarlo señalado
   en un listado de "revisar" al final de la importación. Lo mismo con
   *Caja exagonal*, que no tiene costo unitario y sí un costo de producción
   forzado de 2.000.
10. Informar al terminar: cuántos insumos, productos y combos se importaron, y
   cuántos productos no reproducen el valor esperado de la planilla.

---

## 8. Criterio de aceptación

Este es el criterio objetivo. **No se considera terminado el motor hasta que los
tests pasen.**

Archivos provistos:

| Archivo | Contenido |
|---|---|
| `fixtures_insumos.csv` | 26 insumos con su costo unitario esperado |
| `fixtures_productos.csv` | 76 productos con sus consumos y los valores esperados de materiales, subtotal, costo de producción y precio |
| `fixtures_combos.json` | 2 combos con sus líneas, costo y precio esperados |

Los tres usan `;` como separador y `.` como decimal.

### 8.1 Motor y datos

1. Para cada uno de los 76 productos, el motor reproduce `esp_materiales`,
   `esp_subtotal`, `esp_costo_prod` y `esp_precio` con tolerancia de 0,01.
2. Para los 2 combos, reproduce `esp_costo` y `esp_precio`.
3. Cambiar `beneficio` de 0,35 a 0,40 modifica los 76 precios y ningún costo.
4. Un pedido guardado conserva sus precios tras cambiar cualquier parámetro global.
5. Exportar e importar el respaldo devuelve una base idéntica.
6. Se puede crear un insumo, un producto y un combo desde cero, sin importar
   nada, y el precio resultante es correcto.
7. Desactivar un insumo en uso avisa en qué recetas aparece y no rompe los
   pedidos históricos.

### 8.2 Excel

8. Exportar a Excel, modificar el monto de compra de un insumo en la planilla,
   reimportar: la previsualización anuncia exactamente ese cambio, y al
   confirmar los precios afectados se recalculan.
9. Reimportar un Excel exportado y no modificado no genera ningún cambio.
10. Un Excel con un código duplicado o una referencia inexistente se rechaza
    entero, sin aplicar nada, listando las filas con problema.

### 8.3 Pedidos

11. Un pedido de $ 39.440 con una seña de $ 15.000 queda en estado `SEÑADO`
    con saldo $ 24.440. Al registrar un segundo pago de $ 24.440 pasa a
    `PAGADO` con saldo cero.
12. Un pago mayor al saldo pendiente se rechaza.
13. El historial de ese pedido contiene, con fecha y hora, los eventos de
    creación, los dos pagos y la entrega, en orden.
14. Anular un pago recalcula el saldo y deja el pago visible como anulado.

### 8.4 Mensajes

15. La plantilla de confirmación reemplaza todos los marcadores; editarla en
    configuración cambia el mensaje generado sin tocar el código.
16. Un pedido sin seña genera un mensaje sin los renglones de seña y saldo;
    el mismo pedido con una seña los incluye, usando la misma plantilla.
17. La nota interna no aparece en ningún mensaje generado.

### 8.5 Estilos e interfaz

18. Los cuatro tests del guardián de literales (sección 6.2) pasan.
19. **Contraste**: cada par de tokens declarado en la tabla de "Reglas de uso"
    de DISEÑO.md alcanza 4,5:1. Se calcula parseando `tokens.css`, sin navegador.
20. **A 360 px de ancho, con el catálogo real cargado**: ningún importe partido
    en dos líneas, ninguna superficie interactiva menor a 48 × 48 px, 96 px de
    relleno inferior en las listas. Se verifica con Playwright sobre Chromium.
    **No es automatizable en jsdom**, que no tiene motor de layout y devuelve
    ceros: un test así siempre pasa y no mide nada.
21. Ninguna hoja de estilos ni documento referencia una fuente remota, y las
    familias empaquetadas incluyen todos los pesos que usa DISEÑO.md.

### 8.6 PWA

22. La app carga y opera con el modo avión activado, incluida la importación
    de un Excel y la copia del mensaje al portapapeles.
23. El `scope` y el `start_url` del manifest incluyen `/candelaria/`, y el
    service worker se registra con ese scope. Si quedan en `/`, el service
    worker no controla la app y el modo avión falla en silencio.
24. Al haber una versión nueva, la app avisa y permite actualizar; no se queda
    con la versión vieja cacheada.
25. Al instalar se solicita `navigator.storage.persist()`.

Caso de referencia para depurar — **V1 Pino chico**:

| Concepto | Valor |
|---|---|
| Cera alto pf | 82 g × 7,81 = 640,42 |
| Pabilo | 0,5 × 100 = 50,00 |
| Esencia | 5,74 g × 150 = 861,00 |
| Colorante | 0,136667 ml × 170 = 23,23 |
| Aceite de coco | 0,0164 × 18.000 = 295,20 |
| Materiales | 1.869,85 |
| Mano de obra | 45 min → 5.250,00 |
| Subtotal | 7.119,85 |
| Costo de producción | techo(7.618,24 → 100) = 7.700 |
| Precio | 10.395 |

---

## 9. Fuera de alcance de esta versión

No implementar, aunque parezcan obvios: stock, órdenes de producción, listas de
precios por cliente, múltiples dispositivos, informes de rentabilidad por
período, gestión de proveedores, modo oscuro, cuentas de usuario, respaldo en
la nube, envío automático de mensajes, recordatorios programados, cuenta
corriente por cliente con arrastre de saldos entre pedidos, baja individual de
pedidos, TypeScript, librerías de estado y de enrutado.
