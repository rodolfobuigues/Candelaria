# Supabase de Candelaria

Supabase es la fuente vigente; IndexedDB se reserva al desarrollo local sin
configuración remota. No volver a importar la planilla histórica para actualizar.

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
