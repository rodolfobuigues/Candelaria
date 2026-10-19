# Operación de Candelaria

Guía de los controles implementados al 19/10/2026. No autoriza a una IA a crear
ventas, registrar pagos, enviar mensajes o restaurar una base por iniciativa propia.
Para requisitos aún no completos ver [CONTINUIDAD.md](CONTINUIDAD.md).

## Entrar y comprobar la actualización

Abrir [Candelaria](https://rodolfobuigues.github.io/Candelaria/) o su PWA instalada.
El visitante ve combos; Administrar lleva al acceso del creador. Se requiere
conexión para consultar/guardar los datos remotos. No se distribuye por Play Store.

Guardar el trabajo abierto antes de activar una actualización. Si aparece
«Hay una versión nueva de Candelaria», tocar «Actualizar ahora». El buscador
directo de componentes identifica la mejora más reciente del 19/10: en Nuevo
combo aparece «Buscar producto o insumo» con sugerencias visibles al escribir.
No deducir versión sólo de colores o de la cantidad de productos.

Si no aparece el cambio, cerrar/reabrir con internet y comprobar también en el
sitio HTTPS. No borrar datos, desinstalar ni restaurar un JSON para actualizar
la interfaz. Capturar el síntoma y consultar la guía técnica si persiste.

## Catálogo privado

En Productos elegir Combos, Productos o Insumos y usar el buscador. Las acciones
de alta y edición disponibles abren un formulario sin barra inferior.

| Entidad | Procedimiento |
|---|---|
| Insumo | Cargar nombre, código, unidad y monto/cantidad de compra. Cantidad mayor que cero; costo unitario derivado. Conservar el rol ya asignado. |
| Producto | Revisar código sugerido libre, categoría, receta, recipiente/herencia, extras y costo/precio en vivo. Duplicar desde su ficha copia una receta con código libre. |
| Combo | Buscar nombre parcial o código, tocar coincidencia y editar la cantidad inicialmente igual a 1. Se distinguen productos e insumos. Cambiar conserva cantidad; Quitar elimina sólo esa línea del formulario. |

Los códigos e identidades anteriores pueden tener otro formato. No renombrarlos
para uniformar el catálogo. Un código repetido debe bloquear el alta, no reemplazar
su receta. Cambios sin guardar muestran una advertencia al salir.

En el combo separar nombre interno de nombre y descripción comerciales. La
sugerencia comercial se revisa antes de guardar. Describir lo que recibe el cliente;
no escribir recetas, cantidades de materias primas, trabajo o notas privadas.

Hasta tres fotos por registro; la primera es la principal. Usar fotografías
reales. Si falta una, se muestra su ausencia. En remoto se suben a Storage antes
de guardar la referencia. El catálogo visitante usa fotos públicas HTTPS.

Si el mensaje indica «guardado» pero falta publicación, usar Reintentar publicación
o ir a Ajustes; no crear otra vez el mismo registro. Si falla el cálculo, revisar
roles/cantidades en Insumos y el error concreto. No usar SQL ni precios cero como arreglo.

## Ventas, cobro y entrega

1. En Vender buscar y agregar productos o combos. Ajustar cantidad y, si corresponde,
   precio aplicado. La línea conserva el precio original de referencia.
2. Abrir Ver pedido y cargar nombre del cliente; teléfono y nota son opcionales.
   La nota es interna. La seña se registra como pago parcial después de guardar.
3. Guardar confirma el pedido y asigna su número en la base. El borrador no es
   una venta guardada: vive sólo en esa pestaña/usuario y vence tras ocho horas sin cambios.
4. En Pedidos buscar nombre o número, elegir filtro y revisar saldo agregado.
   Cobro y entrega son estados independientes. No llamar vencido a un pedido sin fecha pactada.
5. En la ficha, Registrar pago propone el saldo. Reducir para un pago parcial;
   no superar lo pendiente. Revisar medio antes de guardar.
6. Para corregir un pago, Anular pago con motivo; conservar pago e historial.
   Entregar y Corregir entrega con motivo son acciones separadas del cobro.

Ante conflicto entre dispositivos, reabrir el pedido y revisar pagos vigentes.
No pisar datos con una copia vieja ni repetir un cobro automáticamente. La app
intenta comprobar si un pago con la misma identidad ya quedó guardado cuando
una respuesta fue incierta. Una conexión fallida no prueba por sí sola que no se guardó.

No existe cancelación/borrado individual de pedido en el flujo vigente. No usar
restauración, borrado de tablas o edición directa del historial para simularlo.

## Mensajes y WhatsApp

La pantalla de mensaje permite copiar y preparar apertura de WhatsApp con texto.
Revisar destinatario y contenido; abrir un enlace no acredita envío ni recepción.
Una IA no envía mensajes sin instrucción explícita del usuario.

El teléfono del cliente pertenece al pedido. El teléfono comercial del catálogo
es otro dato, en Ajustes → Publicación y contacto; quedó vacío por decisión del
dueño. Sin él, el visitante copia consultas, sin enlace comercial a WhatsApp.

Las plantillas se editan desde Ajustes y se guardan centralmente. Una copia local
antigua no sobrescribe automáticamente la central. La confirmación sin seña
omite seña/saldo; recibos y rectificaciones pueden mostrar cero informativo.
La nota interna no se incorpora mediante `{nota}`.

## Parámetros

En Ajustes revisar las unidades explicadas en pantalla: beneficio como fracción,
esencia como porcentaje y redondeo como entero positivo. Guardar recalcula el
catálogo; no recalcula los pedidos guardados. Los valores de inicio provienen
de `src/config/parametros.js` si no hay registro remoto de parámetros.

La validación debe mostrar el dato responsable del error y conservar el estado
anterior. Si se guardó y sólo falló publicación, usar Reintentar publicación.
No asumir que existe un historial completo de cambios de parámetros: ver discrepancias.

## JSON: respaldo y restauración

En Ajustes → Datos, Respaldo / Descargar JSON genera copia de registros,
plantillas centrales y fotos externas descargadas. Esperar el resultado y
conservar el archivo descargado fuera del repositorio. El navegador puede pedir
permiso de descarga; el archivo no se conserva sólo por aparecer un mensaje.

Para restaurar: elegir un JSON conocido, revisar su procedencia y la validación,
leer la confirmación y conservar la copia previa que se descarga. Reemplaza el
conjunto de datos; no es una actualización visual. No probar restauraciones en producción.
Si las fotos actuales no se descargan, la copia previa de emergencia declara
que incluye datos y URLs pero no esas imágenes; exige confirmación específica.

Un JSON con `medios` debe contener las fotos referenciadas; una copia antigua sólo
con URLs no recupera imágenes eliminadas. Base y Storage no forman una sola
transacción: una falla puede dejar objetos nuevos sin referencia. No borrar esos
objetos sin revisar referencias y alcance autorizado.

## Excel y CSV: intercambio revisable

Exportar primero el catálogo vigente desde Ajustes. XLSX contiene 11 hojas,
incluidos extras, líneas y las hojas de pedidos de consulta. Conservar IDs y
columnas de contrato. Editar campos de entrada, no fórmulas ni derivados.
El importador admite archivos de hasta 20 MB; muestra altas, modificaciones,
errores e impacto de precios antes de confirmar.

Revisar y confirmar sólo los cambios deseados. Se descarga un JSON previo y se
comparan los datos otra vez al aplicar. Si cambiaron mientras se preparaba,
volver a revisar. Las fotos, registros omitidos y pedidos se conservan; las hojas
de pedidos/historial no se reimportan. CSV legado también pasa por revisión y
usa punto y coma como separador y coma decimal.

Excel sirve para cambios de catálogo; no sustituye el respaldo JSON con fotos y
plantillas. La planilla de agosto es fuente histórica, no el Excel de intercambio
vigente y no se importa para recuperar un proyecto pausado.

## Si algo falla

| Síntoma | Primer paso |
|---|---|
| App abre pero no guarda | Revisar conexión/sesión y conservar el texto del error. |
| Catálogo comercial viejo | Confirmar dato privado guardado; Reintentar publicación. |
| Error de rol o receta | Abrir Insumos y corregir el dato identificado, sin resembrar. |
| Fotos faltantes | Verificar referencias/Storage; no reemplazar por imágenes inventadas. |
| Proyecto pausado | Confirmar proyecto y reactivación en Dashboard; no reimportar ni reinstalar esquema. |
| Error de importación | Conservar archivo e informe; cancelar o corregir, no forzar escrituras. |

Para diagnóstico técnico ver [DESARROLLO.md](DESARROLLO.md) y
[SUPABASE.md](../SUPABASE.md). Las capturas para soporte deben excluir clientes,
teléfonos, pagos y notas que no sean necesarios para el diagnóstico.
