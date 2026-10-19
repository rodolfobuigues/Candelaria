# Continuidad, decisiones y pendientes

Corte documental: 19/10/2026. Leer con [ESTADO.md](../ESTADO.md) y el código actual.
No es una orden de implementar pendientes ni una certificación completa del producto.

## Decisiones confirmadas por el dueño

| Decisión | Fuente y consecuencia |
|---|---|
| Revisar ambas carpetas | Aplicación en `D:/Colo/Candelaria`; negocio e historia en `D:/Maira/App Velas`. |
| Aplicar las mejoras del informe | Mensajes del 19/10; evidencia en MEJORAS. Conservar datos reales. |
| Continuidad terracota | Variante elegida; mantener identidad y fuentes locales. |
| WhatsApp todavía sin número | No inventarlo ni publicar un destinatario provisional. |
| Fotos a cargo del dueño | Ausencia explícita; no generar fotografías de productos ficticios. |
| Selector directo de combos | Escribir nombre/código, tocar coincidencia y cantidad 1 editable después. |
| Documentar operación y desarrollo | Guías de esta carpeta y entradas AGENTS en ambas raíces. |

No copiar información personal del chat al proyecto para completar estas guías.
La autorización de una tarea anterior no se convierte en permiso general para
futuras restauraciones, permisos, pagos, mensajes o despliegues.

## Evidencia que ya existe

- Implementación inicial de mejoras: `7f14953`; detalles y huellas en MEJORAS y
  la copia privada local. Políticas y RPC instaladas/verificadas el 19/10.
- Buscador de componentes: código `c5320a4`; cierre documental `783ecaf` antes de
  esta entrega. GitHub Pages aprobó el flujo enlazado en MEJORAS. Worker v6.
- Suite de ese código: 289 pruebas, 27 suites, sin fallos ni omitidas. Build de
  105 módulos y verificación de artefactos aprobados. Son resultados fechados;
  volver a ejecutar lo pertinente después de cambiar código.
- Pruebas SQL previas: 18 comprobaciones con PostgreSQL en memoria. Los tres
  roles también se verificaron en remoto sin crear pedidos de prueba.
- Android: navegador con ancho móvil verificado; la prueba física integral y
  con lector de pantalla sigue pendiente. No presentar emulación como esa prueba.

Las cantidades de productos, pedidos y fotos descritas en informes son capturas
del momento. Consultar la app si una tarea necesita cantidades actuales. No usar
un conteo de fixtures para diagnosticar pérdida de datos en Supabase.

## Diferencias conocidas entre documentos y aplicación

Estas diferencias se identificaron leyendo los archivos; no se cambió su lógica
en la tarea documental. Conservar los registros actuales y consultar al dueño
antes de resolver una decisión de negocio.

| Tema | Evidencia y tratamiento |
|---|---|
| Prefijo de reposiciones | El CLAUDE anterior pedía `RP`; ESPECIFICACION §5.2 permite sugerencia V/R y `sugerirCodigoProducto` usa R para recipiente y V para el resto. Hay códigos históricos R150/R50/R170. No renombrar ni migrar automáticamente. |
| Medios de pago | ESPECIFICACION §3.5.2 incluye OTRO; RegistroPago ofrece EFECTIVO, TRANSFERENCIA y MERCADO_PAGO. Documentar lo que muestra UI y decidir la equivalencia antes de cambiar históricos. |
| Fecha/nota del pago | La especificación pide fecha editable y nota; el formulario actual usa fecha del momento y no ofrece esos campos. No prometerlos en soporte. |
| Historial de parámetros | La especificación pide fecha/valor anterior; `parametrosRepo.js` conserva un registro actual sin bitácora dedicada. No afirmar auditoría de cada cambio. |
| Duplicado y baja de catálogo | La especificación pide las acciones para las tres entidades; UI tiene duplicado de producto y conserva `activo`, pero no ofrece todos los controles de duplicado/baja. No crear atajos de borrado físico. |
| Orden inicial de construcción | PASO_A_PASO describe una app sin backend todavía por construir. Es historia; no reiniciar fases ni ejecutar su importación inicial sobre la app vigente. |

La proyección comercial excluye automáticamente insumos al generar la descripción
de reserva. Un texto comercial escrito por una persona todavía necesita revisión:
no hay garantía automática contra información privada tecleada en ese campo.

## Pendientes del corte

| Pendiente | Qué permitiría cerrarlo |
|---|---|
| Fotografías | El dueño aporta y sube las faltantes. El corte previo tenía 8 de 36 combos con foto; comprobar cantidad actual. |
| Nombres comerciales | Revisión editorial de los nombres genéricos conservando identidades e historia. |
| Referencias gráficas | Faltan cuatro imágenes maestras citadas por los DOCX. No sustituirlas silenciosamente. |
| WhatsApp comercial | Número internacional confirmado por el dueño; mientras tanto, copia de consultas. |
| Android físico | Instalación/actualización PWA, teclado, búsqueda de combos, cantidades, fotos, descargas y portapapeles. |
| Accesibilidad integral | Recorrido con lector de pantalla; las pruebas de contraste no lo sustituyen. |
| Diferencias funcionales | Decisión/implementación y pruebas para cada fila de la tabla anterior. |

Stock, producción, facturación, pagos online y múltiples creadores siguen fuera
del alcance vigente. No convertirlos en pendientes incumplidos por estar presentes
en productos similares. No hay compromisos de nuevas cuotas o servicios pagos.

## Qué actualizar al terminar otra tarea

- ESTADO: fecha, código/base de referencia, cambios, verificaciones realmente
  ejecutadas, publicación si se comprobó y siguiente pendiente.
- Esta guía: decisión nueva, discrepancia resuelta o nuevo límite demostrado.
- ESPECIFICACION/DISENO: sólo cuando el dueño autoriza el cambio funcional/visual.
- Guía operativa: controles o pasos que cambian para quien usa la app.
- Guía técnica/arquitectura: comandos, contratos, esquema o rutas que cambian.

No copiar registros privados para hacer más completo un relevo. No afirmar
«sin pendientes» porque pasen tests si la validación física no se realizó.

## Prompt breve para el siguiente agente

```text
Trabajá sobre el proyecto existente Candelaria. Leé AGENTS.md, README.md,
ESTADO.md y docs/CONTINUIDAD.md. Después consultá sólo las fuentes aplicables.
Confirmá rama y cambios locales; distinguí Supabase vigente de desarrollo local.
La tarea de esta sesión es: [describir el resultado concreto autorizado].
Conservá datos, recetas, fotos, pagos e historial. No reimportes la planilla
histórica ni vuelvas a instalar el esquema. Preguntá sólo si una ambigüedad
material impide decidir. Implementá y verificá el alcance autorizado; registrá
resultado, evidencia y límites. Esta guía no autoriza acciones externas nuevas.
```
