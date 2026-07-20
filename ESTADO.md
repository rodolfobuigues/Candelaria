# Candelaria — Estado del proyecto

**Actualizado: 20/07/2026**

Documento vivo. Se actualiza al cerrar cada fase. Es lo primero que hay que leer
al abrir un chat nuevo.

---

## Dónde estoy

| | |
|---|---|
| Carpeta | `D:\Colo\Candelaria` |
| Repositorio | git iniciado, último commit `e649ce6` |
| Tests | **131 en verde**, 18 suites, 0 fallos |
| Fase actual | **Fase 3, paso 11 — tokens de estilo** |
| Próximo paso | Crear `tokens.css` y `componentes.css`, más el test que barre literales |

---

## Fases

| Fase | Estado | Detalle |
|---|---|---|
| 0 — Preparación | ✅ | Node 24.16, Claude Code 2.1.210, git, `.gitignore` |
| 1 — Reglas y `CLAUDE.md` | ✅ | Resueltas 5 contradicciones entre documentos |
| 2 — Motor de cálculo | ✅ | 76 productos, 26 insumos y 2 combos validados contra las fixtures |
| 3a — Persistencia | ✅ | IndexedDB, respaldo JSON, pagos e historial |
| 3b — Tokens de estilo | ⬜ | En curso |
| 4 — Interfaz | ⬜ | 10 pantallas, de a una |
| 5 — Importador y Excel | ⬜ | |
| 6 — PWA publicada | ⬜ | |
| 7 — Datos reales | ⬜ | |

---

## Qué está construido

```
src/motor/calculo.js                 funciones puras del cálculo
src/motor/calculo.test.js
src/motor/fixtures.test.js           valida contra las 3 fixtures
src/config/parametros.js             valores iniciales
src/persistencia/esquema.js          tiendas de IndexedDB
src/persistencia/db.js               adaptador CRUD
src/persistencia/pedidoLogica.js     funciones puras de pedido
src/persistencia/pedidosRepo.js      lectura con derivados
src/persistencia/respaldo.js         exportar/importar JSON
.claude/hooks/motor-tests.cjs        bloquea si el motor falla
.claude/hooks/tokens-guard.cjs       bloquea literales fuera de tokens.css
```

**Los dos hooks fueron verificados con roturas deliberadas** el 20/07/2026:
mover el beneficio de 0,35 a 0,50 tiró 78 tests, y un hexadecimal fuera de
`tokens.css` fue bloqueado en el acto. Los controles muerden.

---

## Decisiones técnicas tomadas durante la construcción

1. **`total`, `pagado`, `saldo` y `estadoCobro` no se persisten.** Se derivan en
   cada lectura, en `pedidosRepo.js`. `guardarPedido` los despoja antes de
   escribir, aunque el objeto los traiga. Hay un test que guarda esos campos
   falseados a mano y verifica que la lectura devuelve los reales.
2. **Navegación:** cuatro pestañas — Vender · Pedidos · Productos · Ajustes.
   Los insumos viven en una solapa dentro de Productos, no en pestaña propia.
3. **Alta y ficha de pedido son la misma pantalla, con dos estados.** Sin
   guardar, solo "Guardar". Guardado, aparecen pagos, historial y el resto.
4. **Filtros de pedidos:** Con saldo · A entregar · Cerrados.
5. **Reposiciones:** prefijo `RP`. El importador renombra `R150`, `R50` y `R170`
   a `RP150`, `RP50`, `RP170`.

---

## Pendientes anotados

| Pendiente | Cuándo |
|---|---|
| La herencia de costo (`heredaCostoDe`) está escrita pero **no ejercitada con datos reales**. Los tres productos que la usan pasan por ahí recién en el importador | Fase 5 |
| El exportador a Excel **debe leer con `listarPedidos`**, nunca crudo sobre la tienda de pedidos | Fase 5 |
| Revisar el costo de **Bolsa gruesa** (304,17 vs 1.500 forzado) y **Caja exagonal** (sin costo unitario, 2.000 forzado) | Fase 7, tras importar |
| Elegir la **URL definitiva** antes del primer pedido real: cambiarla borra todos los datos del celular | Fase 6 |

---

## Cómo retomar en un chat nuevo

Mensaje de arranque:

```
Leé ESTADO.md. Estoy en [fase]. Acá va la salida de Claude Code: [pegar]
```

No hace falta re-explicar el proyecto: está en los documentos.
