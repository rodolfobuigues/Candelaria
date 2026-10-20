# Impacto del cambio de permisos de Supabase

Análisis del 20/10/2026. Alcance: documentación oficial, SQL y acceso a datos
del repositorio; reproducción en PostgreSQL aislado. No se consultaron los ACL
actuales del proyecto remoto ni se modificaron datos, permisos o configuración.

Corrección local autorizada y realizada el mismo día: esquema y verificador
actualizados, 93 comprobaciones aisladas aprobadas. No se modificó Supabase remoto.
Los hallazgos y la reproducción inicial que siguen conservan la evidencia previa.

## Conclusión

El cambio del 30/10/2026 conserva los permisos de las tablas existentes.
Crear productos, combos, pedidos o pagos agrega filas a tablas existentes;
no crea tablas. El uso normal de la instalación vigente no requiere otra
actualización Android por este comunicado.

Se encontró y corrigió una deficiencia reproducible en la instalación desde cero:
faltaban grants explícitos para cinco tablas privadas. Las futuras tablas que se
quieran consultar mediante la API deben incluir sus permisos en la migración.

## Fuentes verificadas

- [Anuncio oficial](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically):
  tablas existentes conservadas; tablas nuevas necesitan permisos explícitos.
- [Seguridad de la API](https://supabase.com/docs/guides/api/securing-your-api):
  grants y RLS son controles diferentes; conceder sólo operaciones necesarias.
- `supabase/schema.sql`, `seguridad_datos.sql`, `intercambio_excel.sql`,
  `migrations/20260914_catalogo_publico.sql`, `verificar_seguridad.mjs`.
- `src/config/supabase.js`, `src/persistencia/db.js`,
  `catalogoPublicoRepo.js`, `fotosStorage.js` y `.github/workflows/deploy.yml`.

## Resultado por escenario

| Escenario | Efecto |
|---|---|
| Instalación actual sin recrear tablas | El anuncio no revoca sus permisos actuales. No se verificaron nuevamente en remoto en este análisis. |
| Alta/edición de productos, combos, pedidos o pagos | Son escrituras de filas; no activan el cambio de tablas nuevas. |
| Restaurar JSON desde la app o aplicar Excel | Las RPC trabajan con filas de las tablas existentes; no recrean el esquema. |
| Publicar interfaz en GitHub Pages | El workflow no crea tablas ni instala SQL. |
| Proyecto nuevo o reconstrucción de tablas sin permisos automáticos | El esquema corregido declara los permisos de las cinco tablas privadas; el esquema previo fallaba. |
| Tabla nueva para una función futura | Incluir grants necesarios, RLS y políticas en la misma migración. |
| Reset local o rama que reconstruya tablas | Utilizar el esquema corregido. No se encontró configuración de Supabase CLI en `supabase/`. |

La app utiliza `supabase-js` y la Data API, no una conexión PostgreSQL directa.
No deshabilitar la Data API para intentar resolver este aviso.

## Hallazgos previos a la corrección

1. `schema.sql` crea siete tablas de aplicación, todas con RLS.
2. `catalogo_publico_combos` ya tiene SELECT para `anon` y `authenticated`,
   y escritura para `authenticated`; la política restringe la escritura al creador.
3. `insumos`, `productos`, `combos`, `parametros` y `pedidos` tienen políticas,
   pero los archivos de instalación no conceden sus permisos de tabla a
   `authenticated`. Las políticas no sustituyen esos grants.
4. `creadores_autorizados` revoca acceso directo al navegador intencionalmente.
   No exponerla para corregir las otras cinco tablas.
5. `verificar_seguridad.mjs` agrega los grants de las cinco tablas después de
   cargar los archivos de instalación. Ese soporte permite probar RLS, pero
   oculta la omisión de permisos en una instalación nueva.
6. Las RPC de pedidos, restauración y Excel declaran EXECUTE para
   `authenticated` y usan `security invoker`: también necesitan los permisos
   de las tablas que manipulan. No basta con poder ejecutar la función.
7. No se encontró uso de `service_role` en el código de la app ni secuencias
   propias: los IDs de estas tablas son text/uuid y el número de pedido se
   calcula en la RPC. No copiar grants de servidor o secuencias por rutina.

## Verificación realizada

Se ejecutaron los tres SQL vigentes en PGlite existente en el equipo, sin
instalar dependencias ni conectar a Supabase. Los roles de API empezaron sin
grants automáticos sobre tablas de `public`. Los usuarios técnicos fueron
sintéticos; no se copiaron registros privados.

- Siete tablas creadas; RLS habilitado en las siete.
- Cinco tablas privadas sin SELECT/INSERT/UPDATE/DELETE para `authenticated`.
- SELECT sobre insumos como creador autorizado: error PostgreSQL `42501`,
  `permission denied for table insumos`.
- Con los cinco grants específicos, añadidos sólo en esa base descartable,
  SELECT del creador funciona; `anon` puede leer la proyección comercial y
  sigue sin poder leer insumos.

La reproducción demuestra el defecto del esquema de instalación. No certifica
la configuración remota ni reproduce HTTP/PostgREST; comprueba el permiso
PostgreSQL que necesita esa API. La base aislada se cerró al terminar.

## Corrección aplicada al repositorio

`schema.sql` incorpora en el mismo archivo que crea las tablas:

```sql
grant select, insert, update, delete
on table public.insumos, public.productos, public.combos,
         public.parametros, public.pedidos
to authenticated;
```

Conservar las políticas del creador, los grants específicos del catálogo y la
restricción de `creadores_autorizados`. No conceder acceso anónimo a las cinco
tablas privadas, no usar `ON ALL TABLES` ni restablecer permisos automáticos
globales. El ejemplo del comunicado debe adaptarse a cada tabla y rol.

El verificador ya no agrega permisos sobre tablas de aplicación ni repite el
alta del creador después de instalar. El soporte de `auth` y `storage`,
administrados por Supabase en el entorno real, se configura antes de los SQL.
Se verifican siete tablas con RLS y 56 decisiones de acceso: dos roles por
cuatro operaciones sobre siete tablas, incluida la lista privada de creadores.

La prueba nueva falló con el esquema anterior en `authenticated SELECT en
insumos: esperado true, recibido false`. Después de agregar el grant al esquema,
aprobó 93 comprobaciones: matriz de permisos, lecturas del creador, aislamiento
de otro autenticado y de anónimo, pedidos/pagos, parámetros, restauración,
concurrencia, rollback y modificación de un insumo mediante la RPC de Excel.
Esto comprueba el contrato de instalación y sus operaciones en PostgreSQL; no
sustituye la verificación remota ni HTTP/PostgREST. No se ejecutó un build de UI
ni se instalaron dependencias para este cambio.

Comando de reproducción: `node supabase/verificar_seguridad.mjs URL_DEL_MODULO_PGLITE`.
Ver [desarrollo](DESARROLLO.md) para el formato del módulo existente en el equipo.
Las instrucciones de agentes también exigen grants explícitos para tablas futuras.

Para producción, revisar primero Data API settings y los privilegios efectivos
de las siete tablas. Si están correctos, el cambio de plataforma no exige
reinstalar el esquema ni ejecutar otra migración. Una corrección remota, si
realmente falta un permiso, debe ser específica y preservar RLS y datos.

## Pendiente

- Comprobar la configuración y matriz de permisos remotos en una revisión de
  sólo lectura antes del 30/10; registrar resultados sin datos de clientes.
- Mantener grants explícitos como requisito de futuras migraciones.

Este análisis no autoriza cambios de permisos remotos ni la ejecución de resets.
