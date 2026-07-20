# Candelaria — Guía de diseño

Complemento visual de `ESPECIFICACION.md`. Donde los dos documentos difieran,
manda la especificación: **esto define cómo se ve, no qué hace.**

Las capturas de referencia entregadas son **orientativas de estilo, no de
contenido.** Fueron generadas antes de cerrar varias decisiones funcionales. La
sección 8 detalla, pantalla por pantalla, qué se conserva y qué se descarta.

---

## 1. Reglas duras

1. **Un solo tema claro.** No hay modo oscuro ni interruptor para activarlo.
2. **No hay cuentas de usuario.** Sin avatar, sin foto de perfil, sin "cerrar
   sesión", sin nube.
3. **Una sola navegación:** la barra inferior de cuatro pestañas. **No hay menú
   hamburguesa** en ninguna pantalla.
4. **Ningún valor literal fuera de `tokens.css`.** Ni un color, ni un radio, ni
   una sombra, ni un espaciado.
5. **Las fuentes van empaquetadas en la app.** Nunca desde Google Fonts ni
   ningún CDN: la app tiene que verse igual sin conexión.
6. **Ningún importe se parte en dos líneas.** Ver sección 5.
7. Toda superficie interactiva mide al menos 48 × 48 px, aunque su dibujo sea
   más chico.

---

## 2. Tokens de color

Tomados del bloque YAML del sistema de diseño. **La prosa de ese documento
proponía otros valores; se descarta.** Único agregado: la familia `gold`, que
no existía en el YAML pero cumple una función real en las referencias.

```css
:root {
  /* Superficies */
  --color-surface:                   #fff8f6;
  --color-surface-dim:               #e4d7d4;
  --color-surface-container-lowest:  #ffffff;
  --color-surface-container-low:     #fef1ed;
  --color-surface-container:         #f9ebe7;
  --color-surface-container-high:    #f3e5e1;
  --color-surface-container-highest: #ede0dc;
  --color-inverse-surface:           #362f2c;
  --color-inverse-on-surface:        #fbeeea;

  /* Texto */
  --color-on-surface:                #201a18;
  --color-on-surface-variant:        #55433d;
  --color-outline:                   #88726c;
  --color-outline-variant:           #dbc1ba;

  /* Acento principal */
  --color-primary:                   #944228;
  --color-on-primary:                #ffffff;
  --color-primary-container:         #b35a3e;
  --color-on-primary-container:      #fff9f8;
  --color-primary-fixed:             #ffdbd0;

  /* Secundario */
  --color-secondary:                 #775a19;
  --color-on-secondary:              #ffffff;
  --color-secondary-container:       #fed488;
  --color-on-secondary-container:    #785a1a;

  /* Terciario / neutro cálido */
  --color-tertiary:                  #5c5b57;
  --color-tertiary-container:        #75736f;

  /* Error */
  --color-error:                     #ba1a1a;
  --color-on-error:                  #ffffff;
  --color-error-container:           #ffdad6;
  --color-on-error-container:        #93000a;

  /* Dorado — agregado */
  --color-gold:                      #c5a059;
  --color-gold-subtle:               #c5a05933;  /* 20% — separadores */

  /* Semánticos de estado */
  --color-estado-pendiente:          var(--color-secondary-container);
  --color-estado-entregado:          var(--color-tertiary);
  --color-estado-impago:             var(--color-outline);
  --color-estado-senado:             var(--color-secondary);
  --color-estado-pagado:             var(--color-primary);
  --color-positivo:                  var(--color-primary);
  --color-negativo:                  var(--color-error);
}
```

**Reglas de uso:**

| Uso | Token |
|---|---|
| Fondo de pantalla | `surface` |
| Tarjetas | `surface-container-lowest` (blanco puro) |
| Campos de entrada | `surface-container-low` |
| Fila de total resaltada | `surface-container-high` |
| Botón primario | Relleno `primary`, texto `on-primary` |
| Botón secundario | Contorno `gold`, texto `on-surface`, fondo transparente |
| Precio de venta | `primary` |
| Costo, metadatos, códigos | `on-surface-variant` |
| Separadores de lista | `gold-subtle` |
| Barra flotante del carrito | Fondo `inverse-surface`, texto `inverse-on-surface` |
| Píldora de pestaña activa | Fondo `secondary-container`, texto `on-secondary-container` |
| Avisos de atención | Fondo `error-container`, texto `on-error-container` |

**El dorado nunca se usa como color de texto sobre fondo claro** — no alcanza el
contraste. Solo bordes, íconos secundarios y separadores.

**Contraste mínimo:** 4,5:1 para cualquier texto menor a 24 px. Las etiquetas
grises pequeñas van en `on-surface-variant`, nunca en `outline`.

---

## 3. Tipografía

Dos familias, empaquetadas localmente:

| Rol | Familia |
|---|---|
| Títulos de pantalla y de sección | **EB Garamond** |
| Todo lo demás, y **todos los números sin excepción** | **Plus Jakarta Sans** |

**Los importes van siempre en Plus Jakarta Sans con cifras tabulares**
(`font-variant-numeric: tabular-nums`). Las referencias muestran el precio en
serif en la ficha de producto y en sans en Vender: se unifica en sans. Es lo que
mantiene las columnas de números alineadas y lo que se lee más rápido de reojo.

```css
:root {
  --font-titulo: 'EB Garamond', Georgia, serif;
  --font-texto:  'Plus Jakarta Sans', system-ui, sans-serif;

  --texto-display:  500 48px/56px var(--font-titulo);   /* -0.02em */
  --texto-titulo-l: 500 32px/40px var(--font-titulo);
  --texto-titulo-m: 500 24px/32px var(--font-titulo);
  --texto-seccion:  600 20px/28px var(--font-texto);
  --texto-cuerpo:   400 16px/24px var(--font-texto);
  --texto-cuerpo-s: 400 14px/20px var(--font-texto);
  --texto-etiqueta: 700 12px/16px var(--font-texto);    /* 0.05em, mayúsculas */
  --texto-precio:   500 20px/24px var(--font-texto);    /* tabular */
  --texto-precio-l: 600 28px/32px var(--font-texto);    /* tabular, totales */
}
```

**Formato de moneda, obligatorio y único en toda la app:** `$ 10.395` — punto
de miles, coma decimal, espacio duro entre el símbolo y el número. Los importes
del catálogo y de los pedidos se muestran **sin decimales**; solo el desglose de
receta y el costo unitario de un insumo llevan dos decimales, porque ahí los
centavos significan algo.

---

## 4. Espaciado, formas y profundidad

```css
:root {
  --esp-base: 8px;
  --esp-pantalla: 24px;   /* margen horizontal de toda pantalla */
  --esp-elemento: 16px;
  --esp-seccion: 40px;
  --esp-stack-s: 4px;
  --esp-stack-m: 12px;

  --radio-s: 0.25rem;
  --radio-m: 0.5rem;    /* botones, campos */
  --radio-l: 1rem;
  --radio-xl: 1.5rem;   /* tarjetas */
  --radio-pill: 9999px; /* chips, etiquetas de estado */

  --sombra-tarjeta: 0 8px 24px rgba(32, 26, 24, 0.06);
  --sombra-flotante: 0 12px 32px rgba(32, 26, 24, 0.12);
}
```

Ritmo vertical en múltiplos de 8 px. Entre secciones mayores, 40 px. Las
tarjetas no llevan borde: la profundidad la da únicamente la sombra. Al
presionar, la sombra se reduce; nunca se agranda.

---

## 5. Regla de números y desbordes

Es el defecto más visible en las referencias: importes partidos al medio,
nombres tapados por el botón flotante. Se resuelve así, y es verificable:

1. El bloque del importe tiene **ancho fijo** y `white-space: nowrap`. Nunca se
   parte, nunca se encoge.
2. El nombre ocupa el espacio restante y se trunca con puntos suspensivos a
   **dos líneas como máximo**.
3. Las listas llevan **96 px de relleno inferior**, para que ni el botón
   flotante ni la barra del carrito tapen el último elemento.
4. Cifras tabulares en toda columna numérica, para que los dígitos se alineen
   verticalmente.

**Prueba de aceptación:** la lista de productos debe verse correcta con el
nombre más largo del catálogo real — "Bolsa organza 9x12 comunion" — y un
importe de seis dígitos, en una pantalla de 360 px de ancho.

---

## 6. Componentes

| Componente | Definición |
|---|---|
| **Tarjeta** | Fondo blanco, `--radio-xl`, `--sombra-tarjeta`, 20 px de relleno interno, sin borde |
| **Botón primario** | Relleno `primary`, texto `on-primary` 16 px semibold, `--radio-m`, alto 48 px, ancho completo salvo que convivan dos |
| **Botón secundario** | Contorno 1 px `gold`, texto `on-surface`, fondo transparente, mismo alto |
| **Campo de entrada** | Fondo `surface-container-low`, sin borde en reposo, borde 1 px `gold` al enfocar, `--radio-m`, etiqueta siempre visible arriba en estilo etiqueta |
| **Chip de filtro** | Píldora. Inactivo: fondo `surface-container`, texto `on-surface-variant`. Activo: fondo `primary`, texto `on-primary` |
| **Chip de selección** (categoría, unidad) | Igual que el de filtro. Se agrupa en filas que se envuelven, nunca en scroll horizontal oculto |
| **Etiqueta de estado** | Píldora chica, estilo etiqueta en mayúsculas, color según los tokens de estado |
| **Fila de lista** | Alto mínimo 64 px, separador 1 px `gold-subtle`, sin separador después del último |
| **Selector de cantidad** | Barra redondeada con `−` y `+` a los lados del número; cada botón, 48 × 48 px reales |
| **Barra inferior** | Cuatro pestañas con ícono y rótulo: Vender, Pedidos, Productos, Ajustes. Activa con píldora `secondary-container` |
| **Barra flotante del carrito** | Fondo `inverse-surface`, `--radio-l`, flota sobre la lista con `--sombra-flotante`. A la izquierda cantidad y total; a la derecha el botón de avanzar |
| **Botón flotante** | Círculo de 56 px, relleno `primary`, esquina inferior derecha, sobre el margen de la pantalla |
| **Aviso** | Fondo `error-container` para atención, `surface-container` para informativo. Ícono a la izquierda, texto en `--texto-cuerpo-s` |

Íconos de trazo, con extremos y esquinas redondeadas, 24 px, grosor uniforme.
Sin ilustraciones, sin fotografías, sin marcas de agua decorativas detrás del
contenido.

---

## 7. Estructura común

Todas las pantallas principales comparten:

- **Encabezado:** título de pantalla en EB Garamond, alineado a la izquierda.
  En pantallas de detalle, flecha de volver a la izquierda del título. **Nada a
  la derecha del encabezado.**
- **Contenido** con 24 px de margen horizontal.
- **Barra inferior** fija de cuatro pestañas.

Las pantallas de alta y edición se abren como pantalla completa, con una `✕` a
la izquierda del título en lugar de la flecha, y sin barra inferior.

---

## 8. Pantallas

Para cada una: qué debe contener, y qué difiere de la captura de referencia.

### 8.1 Vender

Buscador, fila de chips (Todos · Velas · Recipientes · Combos), lista de
resultados con nombre, código en gris debajo, precio en `primary` y botón
circular `+`. Barra flotante oscura con cantidad, total y "Ver pedido".

*La referencia es correcta. Se conserva tal cual, incluida la barra oscura.*
Quitar el menú hamburguesa y el avatar del encabezado.

### 8.2 Pedido

**Es la pantalla que más difiere de la referencia.** Debe contener, en orden:

1. Cliente y teléfono.
2. Campo de nota con la etiqueta **"Nota interna"** y, debajo en texto chico,
   "Privada. No se envía al cliente." Sin esa aclaración a la vista, no se
   implementa.
3. Líneas del pedido con selector de cantidad. La línea con precio pisado
   muestra el original tachado en `on-surface-variant`, el nuevo en `primary`, y
   un chip "Ajustado −$ 900".
4. **Bloque de totales**, que en la referencia no existe: Total, Pagado y
   **Saldo destacado** en `--texto-precio-l` sobre `surface-container-high`. Sin
   el total, la pantalla no cumple su función.
5. **Bloque de pagos**: lista de pagos con fecha, monto y medio, más el botón
   "Registrar pago". Los pagos anulados se muestran tachados. No está en la
   referencia.
6. **Historial**: línea de tiempo con fecha y hora de cada instancia, de la más
   reciente a la más antigua. No está en la referencia.
7. Un único botón primario al pie: **"Guardar"**. Guardar es confirmar.

**El botón de WhatsApp no va antes de guardar.** En la referencia aparece al
lado de "Guardar", y es incorrecto: el mensaje se genera *después*.

### 8.3 Mensaje generado

Pantalla o panel que aparece **al guardar el pedido**. Tarjeta con el texto del
mensaje ya armado, tipografía de cuerpo, respetando saltos de línea y emojis.
Debajo, dos botones: **"Copiar"** primario y **"Abrir WhatsApp"** secundario,
este último deshabilitado si no hay teléfono cargado.

*No existe en las referencias. Hay que diseñarla.*

### 8.4 Pedidos

Tres filtros: **"Con saldo" · "A entregar" · "Cerrados"**.

*La referencia muestra "Pendientes / Entregados / Cobrados", que corresponde al
modelo de un solo eje ya descartado. No se usa.*

Cada tarjeta lleva: franja vertical de color a la izquierda según el estado de
entrega, nombre del cliente, fecha, **dos etiquetas separadas** — una de entrega
y otra de cobro — y a la derecha el importe. **Si el pedido tiene saldo, se
muestra el saldo con el rótulo "SALDO"; si está pagado, el total con el rótulo
"TOTAL".** El número que importa es el que falta cobrar.

Quitar la marca de agua decorativa detrás de las tarjetas.

### 8.5 Productos

Buscador, lista agrupada por sección con encabezados en estilo etiqueta, y por
fila: nombre, código en gris, precio grande en `primary` y debajo "costo $ …"
chico en `on-surface-variant`. Botón flotante `+` abajo a la derecha.

*La referencia parte los importes en dos líneas y deja el último producto tapado
por el botón flotante.* Aplicar la sección 5 sin excepción.

### 8.6 Ficha de producto

Nombre, código y categoría; precio grande arriba **rotulado "PRECIO", no
"PRECIO SUGERIDO"**.

Tarjeta "Receta" con insumo, cantidad y importe con dos decimales. Debe incluir
las líneas de recipiente y de extras cuando existan; la referencia solo muestra
los insumos fijos.

Tarjeta "Costo" con Materiales, Mano de obra con los minutos, Subtotal y **Costo
de producción resaltado**.

**Cuatro indicadores, todos al mismo nivel visual, en una grilla de dos por
dos:** Margen sobre costo, Peso de la mano de obra, Beneficio bruto y **Beneficio
neto**. *En la referencia, "Beneficio bruto" aparece en una tarjeta terracota
destacada: eso invita a leer mal el número, porque no descuenta la mano de obra.
Va al mismo nivel que los demás y siempre acompañado del neto.*

Al pie, "Editar receta".

### 8.7 Nuevo insumo

Nombre; categoría en cuatro chips — **"Material", no "Material activo"** —;
unidad con **seis opciones: gramo, kilo, mililitro, litro, unidad, hora**, no
tres; monto pagado y cantidad comprada lado a lado; y debajo la tarjeta no
editable de costo unitario derivado, en `surface-container-highest`.

*Salvo esos dos ajustes, la referencia es correcta y se conserva.*

### 8.8 Ajustes

Sección **"Parámetros de cálculo"** con **siete** filas, no cuatro: beneficio,
gastos fijos y desperdicio, redondeo, mano de obra por hora, esencia, colorante
y aceite de coco. Debajo, el aviso de que cambiarlos recalcula todo el catálogo
y no afecta a los pedidos ya tomados.

Sección **"Mensajes"**, ausente en la referencia: tres filas que abren el editor
de plantillas.

Sección **"Datos"** con cuatro filas: "Exportar a Excel", "Importar desde Excel",
"Respaldo" e "Importar planilla original".

*Se eliminan de la referencia:* la sección "Apariencia" con el modo oscuro,
"Respaldo en la nube", "Cerrar sesión" y el rótulo "Importar inventario".
Se conserva el pie con nombre y versión de la app.

### 8.9 Editor de plantillas

Campo de texto multilínea con la plantilla; debajo, una fila de marcadores
tocables que se insertan en el cursor; y debajo, **previsualización en vivo**
sobre un pedido de ejemplo, en una tarjeta con el estilo del mensaje real.
Botón para restaurar el texto original.

*No existe en las referencias. Hay que diseñarla.*

### 8.10 Revisar importación

Los tres contadores — nuevos, modificados, sin cambios — **en una sola fila de
tres tarjetas**, no apilados verticalmente: en la referencia ocupan una pantalla
entera para mostrar tres números.

Debajo, el aviso de atención con la cantidad de precios que cambian y la mayor
variación. Después, la lista de cambios: nombre, **código real del registro**
—M1, E1, A5— valor anterior tachado, flecha, valor nuevo en `primary`.

*La referencia inventa una taxonomía inexistente y mezclada con inglés —
"INSUMO #321", "ENVASE #08", "AROMA #45", "PACKAGING #99". Se descarta: va el
código real.*

Al pie, "Cancelar" secundario y "Aplicar cambios" primario.

### 8.11 Pantallas faltantes

No hay referencia visual y se resuelven aplicando estas reglas: alta y edición
de producto con receta, alta y edición de combo, listado y ficha de insumo,
formulario de registro de pago.

---

## 9. Nombre y marca

La app se llama **Candelaria**. "Candelaria aa" es el nombre del sistema de
diseño y no aparece en ninguna pantalla.

---

## 10. Verificaciones de diseño

Automatizables, y por lo tanto obligatorias:

1. Ningún archivo fuera de `tokens.css` contiene un hexadecimal, un `rgb(`, o
   un valor literal de radio, sombra o espaciado.
2. Ninguna hoja de estilos ni documento referencia una fuente remota.
3. No existe la cadena "modo oscuro", ni `prefers-color-scheme`, ni ninguna
   variante de tema alternativo.
4. Todo elemento interactivo mide al menos 48 × 48 px.
5. Todo texto menor a 24 px alcanza contraste 4,5:1 contra su fondo.
6. Con el catálogo real cargado, ninguna lista produce un importe partido en
   dos líneas a 360 px de ancho.
