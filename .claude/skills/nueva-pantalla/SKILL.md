---
name: nueva-pantalla
description: Implementa o modifica una pantalla de Candelaria preservando las reglas vigentes y verificando el flujo afectado.
argument-hint: [productos|ficha-producto|vender|pedido|mensaje|registro-pago|pedidos|insumo|producto-editar|combo-editar|ajustes|editor-plantillas]
---

# Trabajo de interfaz en el proyecto existente

Leer [AGENTS.md](../../../AGENTS.md) y la sección aplicable de
[DISENO.md](../../../DISENO.md) y [ESPECIFICACION.md](../../../ESPECIFICACION.md).
La guía técnica está en [DESARROLLO.md](../../../docs/DESARROLLO.md).
PASO_A_PASO es histórico; no reiniciar fases ni sembrar datos remotos.

## Preparar

- Identificar la pantalla y su flujo, reglas, repositorio y pruebas.
- Confirmar qué pidió el usuario y qué puede modificarse en esta sesión.
- Reutilizar App, enrutador, comunes, tokens y estilos. Crear una carpeta nueva
  sólo si la tarea realmente añade una pantalla, siguiendo la convención actual.
- Declarar una discrepancia con la especificación en CONTINUIDAD, sin corregir
  la definición del negocio por cuenta propia.

## Implementar

- Preact con JSX clásico; hooks de preact/hooks y onInput para campos en vivo.
- Rutas hash mediante el enrutador existente y sin otra librería de estado.
- Toda cifra pasa por config/formato.js. El motor resuelve el cálculo.
- Estilos en componentes.css y valores en tokens.css; sin fuentes remotas,
  segundo tema o excepciones nuevas a los guardianes.
- No agregar dependencias fuera del alcance autorizado.
- Formularios con guarda de cambios, controles bloqueados durante guardado,
  estados de carga/error y recuperación sin duplicar la operación.
- Respetar creador/visitante y nombre/descripcion comerciales separados de receta.

## Verificar

Usar el entorno aislado de DESARROLLO. Una URL localhost no demuestra aislamiento.
Elegir verificaciones según el cambio; ejecutar suite/build/control de artefactos
cuando corresponda y no repetir una suite aprobada sin nuevos cambios o dudas.

Probar el flujo real en navegador, errores, teclado/foco, nombres largos,
importes y superficies de 48 px. Para composición adaptable revisar
360/480/640/1024 px. Medir el área disponible contra scrollWidth. No inventar
mediciones si faltan herramientas; indicar el límite. Android físico y lector
de pantalla son comprobaciones diferentes de emulación y contraste automático.

Si se delega revisión, se puede usar revisor-diseno. Su informe no sustituye
el criterio y revisión del agente responsable. No es obligatorio crear otra
sesión o consumir otro modelo para una modificación pequeña.

## Entrega

Informar cambio, verificaciones ejecutadas, evidencia y pendientes. Actualizar
ESTADO y las guías afectadas. Publicación o escritura remota sólo con el alcance
autorizado de la sesión; un build local no se declara desplegado.
