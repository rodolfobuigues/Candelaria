# Desarrollo, validación y publicación

Leer primero [AGENTS.md](../AGENTS.md). Aplicar el alcance autorizado en la sesión;
estos comandos no son una orden de ejecutarlos todos en cada tarea.

## Preparar el entorno

Trabajar en la raíz del repositorio. Node.js 24 coincide con el CI. En el corte
del 19/10/2026 se verificaron Node 24.16.0 y npm 11.13.0; son versiones observadas,
no una exigencia de actualización periódica.

```powershell
Set-Location -LiteralPath 'D:\Colo\Candelaria'
git status --short
git log -3 --oneline
node --version
npm --version
npm ci
```

No reinstalar dependencias si ya están listas y la tarea sólo cambia documentos.
Conservar el lockfile. No ejecutar `npm audit fix --force` como arreglo genérico.

## Elegir explícitamente la fuente de datos

`src/config/supabase.js` elige remoto si hay URL y clave pública no vacías.
Un servidor en localhost puede operar sobre producción si hereda `.env.local`.
No ejecutar pruebas destructivas bajo esa suposición.

Desarrollo aislado en PowerShell, sin modificar archivos de credenciales:

```powershell
$env:VITE_SUPABASE_URL=' '
$env:VITE_SUPABASE_PUBLISHABLE_KEY=' '
$env:VITE_SUPABASE_ANON_KEY=' '
npm run dev -- --host 127.0.0.1 --port 5190 --strictPort
```

Las cadenas con espacio se recortan a vacío. Definir las tres evita que una
clave legacy reactive el remoto. El proceso usa IndexedDB del origen
`http://127.0.0.1:5190`; las fixtures sólo se siembran con DEV e insumos,
productos, combos y pedidos vacíos. La existencia de parámetros no integra esa
comprobación. Usar otra terminal para remoto y cerrar el servidor al terminar.
No borrar la IndexedDB de un origen que pueda tener trabajo del usuario.

Para conexión real, configurar `.env.local` según `.env.example` con URL y clave
publicable. No copiar valores a informes. No usar `service_role`. Un cambio de
variables requiere reiniciar Vite; un cambio de variables de build exige compilar.

`npm run preview` muestra el build, no un entorno automáticamente aislado: si
ese build lleva configuración remota, también apuntará a Supabase.

## Resolver una tarea

1. Leer el flujo afectado, su repositorio, reglas y pruebas relevantes.
2. Definir comportamiento esperado, datos que puede tocar y validación necesaria.
3. Cambiar la capa responsable. No añadir reglas de dinero en la interfaz ni
   sustituir identidades para evitar una colisión.
4. Revisar el diff; validar el caso concreto con datos controlados.
5. Documentar el resultado y cualquier diferencia pendiente con la especificación.

Si hay cambios ajenos en el checkout, conservarlos y revisar sólo el diff propio.
No imponer un worktree o una reescritura arquitectónica a una corrección pequeña.

## Verificaciones según el cambio

| Cambio | Comprobación |
|---|---|
| Sólo documentación | Rutas, enlaces, coherencia con código, ausencia de secretos y `git diff --check`. |
| Motor, parámetros o importación | Casos afectados y `npm test`; no modificar fixtures para aprobar. |
| Persistencia o pedidos | Pruebas de duplicados, concurrencia, atomicidad y conservación aplicables. |
| Interfaz | Flujo en navegador, foco/teclado, error recuperable y datos conservados. |
| Estilos | Guardianes y contraste de la suite; medición real del flujo afectado. |
| SQL | PostgreSQL aislado antes de instalar; permisos y conservación al actualizar el remoto. |
| Publicación de código | Suite, build, verificación de artefactos y resultado de GitHub Pages. |

```powershell
npm test
npm run test:detalle
npm run build
npm run verificar:build
git diff --check
```

Los dos comandos de tests ejecutan la misma suite con distinto informe; elegir
uno. No repetir una suite aprobada sin cambios o una duda concreta que lo justifique.
`verificar:build` necesita `dist` reciente y comprueba fixtures privadas y precaché.
La advertencia de tamaño de ExcelJS no es un fallo; Excel se carga dinámicamente.

Para SQL: `node supabase/verificar_seguridad.mjs URL_DEL_MODULO_PGLITE`.
El módulo se pasa como URL `file:///.../dist/index.js`. No viene como dependencia
del producto. No copiar una ruta de otra máquina como si fuera portátil ni
instalar PGlite en producción. La prueba descarta su base en memoria.

## Comprobar interfaz móvil

Revisar 360, 480, 640 y 1024 px cuando se cambie composición adaptable. Comparar
`document.documentElement.clientWidth` con `scrollWidth`, no medidas fraccionarias
de un iframe. Medir superficies reales de al menos 48 × 48 px. Probar vacío,
carga/error, búsqueda sin resultados y nombres largos según el flujo cambiado.

En combos: buscar por nombre parcial/código y sin acentos; agregar producto e
insumo; editar cantidad decimal; cambiar sin perderla; quitar; guardar y reabrir.
En ventas: cambiar de sección conserva borrador, guardar no duplica el pedido.
En pagos: una revisión obsoleta debe rechazarse conservando lo ya guardado.

Usar el navegador permitido por el agente y sus herramientas; no requiere un
producto concreto. Los hooks de Claude no se ejecutan automáticamente en todas
las herramientas. Si no hay navegador disponible, informar qué no se verificó.
La instalación PWA, teclado táctil, descargas y portapapeles requieren además
prueba en Android físico; HTTPS/localhost para portapapeles, no HTTP de una IP LAN.

## Publicar cuando esté autorizado

Repositorio `https://github.com/rodolfobuigues/Candelaria`, rama de publicación
`main`. Revisar `git remote -v`, rama, diff y archivos que se van a subir. No
suponer que toda tarea documental o un clon nuevo autoriza publicar o modificar la base.

El flujo `.github/workflows/deploy.yml` usa Node 24 y runners Ubuntu estándar:
`npm ci` → tests → build → `verificar:build` → Pages. La base de Vite y los
recursos PWA usan `/Candelaria/` respetando mayúscula. No subir `dist`, claves,
respaldos ni archivos del negocio para conseguir que funcione el despliegue.

Los SQL no se ejecutan desde ese flujo. La instalación del 19/10 ya se verificó;
no volver a aplicar migraciones por cada ajuste de UI. Si cambia el contrato de
base, seguir [SUPABASE.md](../SUPABASE.md) antes del frontend dependiente.

Cuando cambien recursos PWA, revisar la versión de caché en `public/sw.js` y su
prueba. El aviso permite activar la nueva versión; preservar guardado pendiente
y no forzar una recarga sobre una edición del usuario.

Confirmar el flujo exitoso para el commit correcto, después el sitio real y los
recursos servidos. Un push o un build correcto no acreditan despliegue. En cambios
sólo de documentación se puede usar `[skip ci]` según la configuración del repo;
no usarlo para código, configuración, worker o SQL que necesiten comprobaciones.

Si falla acceso Git, pedir autenticación mediante el mecanismo del entorno;
no solicitar tokens ni contraseñas en el chat. Nunca incluir credenciales en URLs.
