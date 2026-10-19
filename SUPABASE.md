# Supabase de Candelaria

Supabase es la fuente vigente; IndexedDB se reserva al desarrollo local sin
configuración remota. No volver a importar la planilla histórica para actualizar.

## Identificar la instalación

Verificado el 19/10/2026: proyecto Candelaria, referencia pública
`imocygsnqtmmqrbsmrrx`, organización `rodolfobuigues`. Confirmar identidad y
estado en Dashboard antes de una intervención; no guardar aquí UUID de usuarios,
correos, claves ni contenido privado.

`seguridad_datos.sql` e `intercambio_excel.sql` ya quedaron instalados y sus
permisos comprobados en ese corte. No ejecutarlos otra vez por cada despliegue
de UI. Los archivos SQL versionados no prueban por sí solos una instalación
posterior: registrar qué se aplicó y qué se verificó.

## Actualizar una instalación existente

1. Confirmar proyecto y conservar un respaldo de datos y fotos.
2. En Authentication → Users, comprobar el UUID del creador. No autorizar todos los usuarios.
3. En la misma sesión SQL, ejecutar `set candelaria.creador_id = 'UUID_CONFIRMADO';`
   y luego `supabase/seguridad_datos.sql`. Sin un creador autorizado, la migración
   falla y revierte, para evitar bloquear el panel con una lista vacía.
4. Ejecutar la versión actualizada de `supabase/intercambio_excel.sql`.
5. Comprobar permisos anónimo, creador y otro usuario antes de publicar el frontend.
6. Publicar, ingresar y verificar catálogo, precios, fotos, pedidos e historial.
   Ajustes permite reintentar la publicación comercial si falla.

No ejecutar `schema.sql` en una actualización. La migración agrega campos,
validaciones y funciones; no importa fixtures ni cambia costos.

No recorrer `supabase/` ejecutando todos los archivos. La migración histórica
`migrations/20260914_catalogo_publico.sql` contiene una política antigua que
permitía escritura pública comercial a cualquier autenticado; `seguridad_datos.sql`
la restringe al creador. Ejecutar aquélla después de la seguridad vigente puede
reabrir permisos. Las pruebas `.test.sql` tampoco son pasos de instalación.

## Instalación nueva

Ejecutar `schema.sql`, crear el único administrador, confirmar su UUID e instalar
la migración de seguridad y la RPC de Excel. Configurar `.env.local` desde
`.env.example` con URL y clave publicable. Cerrar el registro público de cuentas.

La clave publicable puede estar en el navegador. Las claves privadas de servidor
no se usan en el frontend ni se guardan en Git.

## Modelo y permisos

- Privadas: insumos, productos, combos, parámetros y pedidos.
- Pública: proyección comercial de combos, precio, fotos y teléfono opcional.
  Nunca recetas ni datos de clientes.
- Storage `catalogo`: fotos públicas; escritura sólo del creador autorizado.
- Pedidos: número transaccional y comparación de revisión.
- JSON: restauración transaccional comparando el estado anterior. Storage se
  prepara antes; una falla no borra fotos previas, aunque puede dejar nuevos
  objetos sin referencia para revisar posteriormente.

## Prueba aislada

`node supabase/verificar_seguridad.mjs [URL_DEL_MODULO_PGLITE]` usa PostgreSQL en
memoria y descarta la base al terminar. No usa credenciales ni registros remotos.
PGlite no se empaqueta en la aplicación. Esta prueba no acredita una instalación remota.

## Incidentes y conservación

- Si está pausado, confirmar proyecto, estado y opción de reactivación en
  Dashboard. Reactivar no requiere ejecutar el esquema ni importar catálogo.
- Si falla el cálculo/publicación, revisar el mensaje, roles y cantidades desde
  el panel. No restaurar toda la base para corregir una descripción o un nombre.
- Antes de una intervención que cambie datos, identificar el alcance y la copia
  previa. Validar cantidades/huellas y permisos después, sin exponer registros.
- El respaldo local del 19/10 en `D:/Maira/App Velas/revision-2026-10-19/respaldo-privado`
  es una captura de aquella intervención; no se actualiza automáticamente.
- La clave publicable no sustituye RLS. El registro de cuentas se cerró en el
  corte verificado; no abrirlo ni ampliar la lista de creadores como arreglo de acceso.

Para restaurar JSON, intercambiar Excel y recuperar fotos ver
[OPERACION.md](docs/OPERACION.md). Para aislar localhost del remoto ver
[DESARROLLO.md](docs/DESARROLLO.md). La documentación no es una autorización para
restaurar o cambiar permisos: aplicar la instrucción vigente de la sesión.
