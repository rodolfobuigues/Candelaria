# Configuración de Supabase para Candelaria

## Qué queda centralizado

- `insumos`: costos vigentes y unidades.
- `productos`: recetas, precios derivados y hasta tres fotos.
- `combos`: componentes y hasta tres fotos.
- `parametros`: beneficio, mano de obra y reglas de cálculo.
- `pedidos`: clientes, líneas, pagos e historial.
- Storage `catalogo`: archivos de imagen del catálogo.

## Puesta en marcha

1. Crear un proyecto gratuito en Supabase.
2. Abrir **SQL Editor** y ejecutar `supabase/schema.sql`.
3. Crear el primer usuario creador en **Authentication → Users**.
4. Copiar `.env.example` como `.env.local`.
5. Completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
6. Importar los datos vigentes del Excel 18/08 mediante el migrador de la aplicación.

La clave `service_role` no se usa en el navegador y no debe entrar al repositorio.
Las políticas RLS dejan el catálogo activo disponible públicamente y reservan
insumos, costos, pedidos y modificaciones para usuarios autenticados.

La conexión de datos y el ingreso del creador se activarán después de contar con
la URL y la clave pública del proyecto. Hasta entonces, la aplicación sigue
funcionando con IndexedDB local.
