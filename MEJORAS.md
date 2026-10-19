# Candelaria — Mejoras del 19/10/2026

Estado de este corte: implementación local verificada y migraciones instaladas en Supabase. Publicación del frontend pendiente de confirmar. Supabase conserva la información vigente; las fixtures son material histórico para pruebas y desarrollo.

Las fuentes funcionales y visuales son [ESPECIFICACION.md](ESPECIFICACION.md) y [DISENO.md](DISENO.md). El diagnóstico que originó el trabajo está en `D:/Maira/App Velas/revision-2026-10-19/INFORME.md`. Ambas carpetas corresponden al mismo producto; `App Velas` conserva las fuentes del negocio.

## Mejoras implementadas

| Mejora | Implementación y validación |
|---|---|
| Parámetros y precios seguros | Un validador compartido bloquea números no finitos, cantidades inválidas y redondeo no positivo antes de escribir. El motor rechaza cálculos inválidos. Pruebas conservan los datos anteriores y las plantillas. |
| Altas sin sobrescritura | `crear` rechaza códigos o identidades repetidos; `actualizar` exige un registro existente. Productos e insumos comprueban duplicados antes de preparar fotos. Prueba conserva receta, fotos y extras del registro original. |
| Insumos estables | `rolMotor` identifica la función en la receta; la edición reconoce los registros anteriores y conserva su rol al renombrar. La administración permite reparar insumos aunque falle el cálculo del catálogo. |
| Publicación comercial | Nombre y descripción comerciales se editan separados de la receta. La proyección pública excluye cantidades de fabricación, insumos y mano de obra. Los nombres históricos permanecen intactos. |
| Control de concurrencia | Los pedidos usan `revision`; una copia obsoleta se rechaza. La numeración se asigna al crear, dentro de una transacción. Las pantallas conservan la revisión devuelta y permiten actualizar después de un conflicto. |
| Pagos recuperables | Cada intento conserva su identidad. Tras una respuesta incierta, la pantalla comprueba si el pago ya quedó registrado antes de ofrecer un nuevo intento. No convierte un conflicto en otra escritura automática. |
| Respaldo completo | El JSON incluye plantillas y copia de fotos externas. Se valida el dominio y el cálculo antes de restaurar. La base se restaura en una transacción con comparación del estado previo. |
| Recuperación con fotos actuales perdidas | Si una foto actual no se puede descargar, una copia previa de emergencia conserva datos y URLs; la pantalla lo declara y pide confirmación específica. El respaldo elegido se restaura con sus propios medios. |
| Permisos del creador | Migración instalada para el único creador existente confirmado. Acceso remoto comprobado como anónimo, creador y otro autenticado. Registro público de cuentas cerrado. Funciones seguras para pedidos y restauración, con pruebas PostgreSQL aisladas. |
| Producto completo | Extras con unidad visible, sugerencia de código libre, duplicación de receta y costo/precio en vivo. Guardar queda bloqueado durante la preparación de fotos y ante cálculo inválido; el formulario y las fotos se bloquean mientras se guarda. |
| Borrador de venta | Selección y datos del cliente aislados por usuario y pestaña en `sessionStorage`. Caduca tras 8 horas sin cambios. Se elimina al guardar, descartar o cerrar sesión; la aplicación purga vencidos cada minuto mientras está abierta. |
| Gestión de pedidos | Búsqueda por cliente o número, filtros, cantidad y saldo agregado real. La ficha resalta saldo y siguiente acción. Actividad y mensajes se agrupan conservando su historial. |
| Navegación y formularios | Sección activa con consultas y detalles, alta/edición sin barra inferior, cierre coherente y advertencia de cambios sin guardar. Las rutas decodifican identidades y controlan enlaces inválidos. Una sola acción de alta en Productos. |
| Fallo de publicación | El acceso al panel permanece disponible para reparar datos. Después de guardar un formulario, un fallo de publicación ofrece reintentar o volver, sin habilitar otra alta. Ajustes distingue guardado de publicación. |
| Plantillas centralizadas | Carga y guardado mediante los parámetros centrales. El editor permite revisar la copia local anterior. Las confirmaciones sin seña omiten seña y saldo; recibos y rectificaciones conservan ceros informativos. La nota interna queda excluida. |
| Catálogo y diseño | Continuidad terracota, fondos más claros, sombras reducidas y fuentes locales. Búsqueda, orden por precio, enlace por combo, consulta copiable y fotografía destacada. Ausencia de foto explícita; sin imágenes inventadas. |
| Accesibilidad | Solapas con flechas, Inicio/Fin, foco y relaciones ARIA. Visor con Escape, foco inicial y retorno. Objetivo táctil de 48 px; las pruebas de contraste no equivalen a una certificación integral. |
| PWA | Cachés y peticiones limitadas a Candelaria; se preservan otras aplicaciones del origen. La reserva HTML se limita a navegación. Excel queda fuera del precaché público y se solicita persistencia local. |
| Producción y dependencias | Fixtures excluidas del build. Vite 8.1.6 con PostCSS 8.5.31 y uuid 11.1.1 en la cadena de ExcelJS 4.4.0. CI verifica pruebas, build y ausencia de fixtures antes de publicar. |

## Verificación local de este corte

Comandos ejecutados el 19/10/2026, con datos históricos o bases aisladas. No importaron datos ni ejecutaron migraciones sobre Supabase.

| Control | Resultado |
|---|---|
| `npm run test:detalle` | 289 pruebas aprobadas; 27 suites; 0 fallos, 0 canceladas y 0 omitidas. |
| `npm run build` | Correcto con Vite 8.1.6; 104 módulos. |
| JavaScript principal | 136,20 kB; 41,59 kB gzip. Es el archivo principal, no toda la descarga inicial. |
| Archivo dinámico del catálogo | 239,13 kB; 62,68 kB gzip. Su nombre no prueba que contenga datos privados. |
| Archivo dinámico de Excel | 938,23 kB; 260,07 kB gzip. Continúa la advertencia de tamaño; no se precarga al instalar el catálogo. |
| `npm run verificar:build` | 3 archivos JavaScript inspeccionados; sin cabeceras ni filas de fixtures privadas. 8 recursos de precaché; Excel excluido. |
| PostgreSQL aislado con PGlite | 18 comprobaciones aprobadas: permisos, pagos, numeración, parámetros, restauración, conflicto y rollback. |
| `git diff --check` | Sin errores de espacios o líneas vacías al cierre. |
| `npm audit --json` | 0 vulnerabilidades informadas por npm el 19/10/2026. No equivale a una certificación de seguridad. |

Reproducir la prueba SQL: `node supabase/verificar_seguridad.mjs` con PGlite disponible. Se puede pasar como primer argumento la URL del módulo instalado. En esta revisión se usó el módulo existente en `D:/Colo/App Control Rutina Entrenamiento Mesociclo/node_modules/@electric-sql/pglite/dist/index.js`; no se agregó como dependencia del producto.

Los casos del panel están en [panel.test.js](src/interfaz/panel.test.js) y [cargaAdministracion.test.js](src/interfaz/cargaAdministracion.test.js). Las pruebas de respaldo, pedidos, Excel y permisos cubren los fallos concretos del informe. La verificación SQL usa PostgreSQL en memoria; no demuestra que las políticas remotas ya estén instaladas.

## Verificación remota y de navegador — 19/10/2026

Se instalaron `seguridad_datos.sql` e `intercambio_excel.sql` sin ejecutar el esquema inicial ni importar datos. Las cinco colecciones conservaron sus cantidades y huellas MD5 de contenido funcional antes y después: 30 insumos, 89 productos, 36 combos, 0 registros de parámetros y 3 pedidos. Se excluyeron del cálculo las columnas nuevas y `updated_at`; no se cambiaron recetas, pagos ni fotos.

La consulta real confirmó un único usuario. Las pruebas bajo los roles anónimo, creador y otro autenticado verificaron el aislamiento de tablas privadas y el acceso público a los 36 combos. El registro de nuevas cuentas quedó deshabilitado y se comprobó nuevamente después de recargar la configuración.

La proyección comercial se generó con el mismo motor y constructor de la aplicación sobre la copia de los datos reales. Los 36 precios y sus fotos coincidieron con la publicación anterior. Se actualizaron sólo nombre, descripción comercial y teléfono vacío: 36 combos publicados, 0 descripciones con mano de obra o materias primas. Los nombres históricos no se renombraron automáticamente.

La copia privada previa conserva los registros originales y 13 imágenes descargadas con SHA-256. Se generó además un JSON autocontenido compatible con la aplicación, aprobado por `validarRespaldo`, sin restaurarlo sobre producción. Está fuera del repositorio, en `D:/Maira/App Velas/revision-2026-10-19/respaldo-privado/`.

En el navegador, el catálogo aislado tuvo 0 px de desborde en marcos de 360/480/640/1024 px (áreas internas de 345/465/625/1009 px), sin controles menores de 48 px. Se comprobaron búsqueda con acentos, búsqueda de contenido, orden de menor precio, respuesta de copia de consulta y galería con foco inicial, Tab contenido, Escape y retorno de foco. El panel aislado conservó una selección de $8.300 al cambiar de pestaña; buscó un pedido por número; bloqueó un alta con código V1 repetido, manteniendo nombre, receta y precio originales; mostró precio en vivo, aviso de salida y error específico para redondeo cero. No se escribieron pedidos ni productos de prueba en Supabase.

## Pendientes visibles

| Pendiente | Condición de cierre |
|---|---|
| WhatsApp comercial | El número permanece sin configurar. El catálogo permite copiar consultas. Habilitar el enlace sólo después de guardar el número internacional confirmado. |
| Fotos y contenido comercial | Subir fotos reales de los 28 combos sin foto y revisar nombres/descripciones comerciales. Conteo confirmado en la copia actual del 19/10: 8 de 36 con fotos. |
| Referencias gráficas maestras | Incorporar las cuatro imágenes maestras citadas por los documentos del catálogo cuando estén disponibles. No se sustituyeron con imágenes ficticias. |
| Despliegue | Publicar sólo después de comprobar las migraciones y volver a validar el catálogo publicado. La existencia de `dist` no significa que se haya desplegado. |
| Android físico | Comprobar instalación/actualización PWA, navegación, teclado, fotos y exportación/revisión XLSX con datos actuales. Las verificaciones de septiembre son históricas. |

Storage no participa de la transacción PostgreSQL. La restauración prepara fotos antes de confirmar la base y no borra objetos previos; una operación fallida puede dejar archivos sin referencia. Las URLs de una copia previa de emergencia no recuperan fotos que ya desaparecieron.

No se añadieron stock, producción, facturación, pagos online ni ampliaciones comerciales ajenas a la especificación. Los archivos históricos de `App Velas` y sus verificaciones anteriores se conservaron.
