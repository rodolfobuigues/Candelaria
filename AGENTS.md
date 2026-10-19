# Candelaria: entrada para agentes de IA

Proyecto existente y publicado. No empezar otra aplicación ni importar de nuevo
la planilla histórica. Esta guía sirve para cualquier agente; las instrucciones
explícitas del usuario en la sesión tienen precedencia.

## Leer al empezar

1. [README.md](README.md): mapa y ubicación de las dos carpetas.
2. [ESTADO.md](ESTADO.md): estado fechado; comprobar `git status` y `git log`.
3. La guía de la tarea: [arquitectura](docs/ARQUITECTURA.md),
   [desarrollo](docs/DESARROLLO.md) u [operación](docs/OPERACION.md).
4. [CONTINUIDAD.md](docs/CONTINUIDAD.md): decisiones, discrepancias y pendientes.
5. Sólo las secciones aplicables de [ESPECIFICACION.md](ESPECIFICACION.md) y
   [DISENO.md](DISENO.md). No releer todo el repositorio para una corrección pequeña.

La especificación define lo requerido; el código y las pruebas demuestran lo
implementado. Si difieren, registrar la diferencia, no convertirla silenciosamente
en una nueva regla. [MEJORAS.md](MEJORAS.md) conserva la evidencia de las mejoras.

## Reglas de trabajo

- Supabase es la fuente vigente de productos, insumos, combos, parámetros y
  pedidos. IndexedDB y fixtures sirven para desarrollo aislado. Los conteos de
  una auditoría son una captura fechada, nunca un límite del catálogo actual.
- Conservar datos, fotos, pagos, historial e identidades. No ejecutar `schema.sql`
  sobre la instalación existente ni todos los SQL como lote. No cargar fixtures
  en producción. Ver [SUPABASE.md](SUPABASE.md).
- No poner clientes, teléfonos, pagos, notas, tokens, contraseñas o respaldos
  privados en documentación, commits, capturas públicas o fixtures. No mostrar
  `.env.local`, `.mcp.json` ni credenciales para diagnosticar una variable.
- Preact y JavaScript; hooks de `preact/hooks`; JSX clásico; rutas hash; conservar
  las capas existentes. Las dependencias nuevas requieren autorización del dueño,
  salvo que ya esté incluida explícitamente en la tarea.
- UI en castellano rioplatense. Formato en `src/config/formato.js`; estilos en
  `src/estilos/componentes.css` y valores visuales en `tokens.css`. No fuentes
  remotas, segundo tema, literales visuales ni excepciones nuevas a los guardianes.
- No cambiar fixtures para hacer pasar un cálculo. Altas mediante `crear`,
  modificaciones mediante `actualizar`; pedidos mediante `pedidosRepo.js`.
  Invalidar el catálogo tras cambiar sus entradas y distinguir guardado de publicación.
- La documentación no otorga autorización nueva para restaurar, borrar, cambiar
  permisos, contratar servicios o publicar. Aplicar el alcance y la autorización
  de la sesión; no pedir otra vez permiso para lo ya autorizado. Consultar sólo
  ambigüedades que cambien materialmente el resultado.
- Las fuentes funcional y visual no se redefinen por iniciativa del agente.
  Actualizarlas cuando la instrucción del dueño autorice esa decisión; para una
  discrepancia no resuelta usar el registro de continuidad.

## Antes de cerrar

- Revisar el diff y ejecutar las verificaciones pertinentes de DESARROLLO.
- Para interfaz, probar el flujo en navegador móvil y conservar evidencia.
  Emulación no equivale a Android físico ni a evaluación con lector de pantalla.
- Informar resultado, validaciones realmente ejecutadas y límites pendientes.
  No llamar publicado a un build local ni instalada a una migración versionada.
- Actualizar ESTADO al cerrar una tarea relevante y CONTINUIDAD si cambian
  decisiones, discrepancias o pendientes. No duplicar requisitos entre guías.
- Conservar cambios ajenos. No hacer limpieza masiva, reset ni reorganización
  de fuentes históricas como parte incidental de otra tarea.
