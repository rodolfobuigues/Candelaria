# Candelaria — Estado del proyecto

**Actualizado: 21/07/2026**

Documento vivo. Se actualiza al cerrar cada fase. Es lo primero que hay que leer
al abrir un chat nuevo.

---

## Dónde estoy

| | |
|---|---|
| Carpeta | `D:\Colo\Candelaria` |
| Repositorio | git iniciado, último commit `72e526f` (Skills y agente corregidos, guardián de requires y contraste automatizado) |
| Tests | **157 en verde**, 18 suites, 0 fallos |
| Fase actual | **Fase 3 cerrada. Fase 4 arrancando** por el paso 11b (cimientos de la interfaz) |
| Próximo paso | Paso 11b: `src/config/formato.js`, `src/persistencia/catalogoRepo.js`, `src/desarrollo/siembra.js`, armazón de enrutado y barra inferior |
| Sin commitear | Nada, salvo `skills_para_revisar.txt` (volcado de lectura para revisión manual, no se versiona) |

---

## Fases

| Fase | Estado | Detalle |
|---|---|---|
| 0 — Preparación | ✅ | Node 24.16, Claude Code 2.1.210, git, `.gitignore` |
| 1 — Reglas y `CLAUDE.md` | ✅ | Resueltas 5 contradicciones entre documentos |
| 2 — Motor de cálculo | ✅ | 76 productos, 26 insumos y 2 combos validados contra las fixtures |
| 3a — Persistencia | ✅ | IndexedDB, respaldo JSON, pagos e historial |
| 3b — Tokens de estilo | ✅ | Tokens, componentes, fuentes locales y guardián con 4 tests de control |
| 4 — Interfaz | 🔄 | Cimientos + 12 pantallas, de a una |
| 5 — Importador y Excel | ⬜ | Incluye "Revisar importación" (DISEÑO 8.10) |
| 6 — PWA publicada | ⬜ | GitHub Pages |
| 7 — Datos reales | ⬜ | |

---

## Qué está construido

```
src/motor/calculo.js                      funciones puras del cálculo
src/motor/calculo.test.js
src/motor/fixtures.test.js                valida contra las 3 fixtures
src/config/parametros.js                  valores iniciales
src/persistencia/esquema.js               tiendas de IndexedDB
src/persistencia/db.js                    adaptador CRUD
src/persistencia/pedidoLogica.js          funciones puras de pedido
src/persistencia/pedidosRepo.js           lectura con derivados
src/persistencia/respaldo.js              exportar/importar JSON
src/estilos/tokens.css                    DISEÑO 2, 3 y 4 + 7 tokens dimensionales + @font-face
src/estilos/componentes.css               los 13 componentes de DISEÑO 6, solo var(--...)
src/estilos/fuentes/                      eb-garamond-500 y plus-jakarta-sans 400/500/600/700 + OFL
src/estilos/guardaLiterales.cjs           implementación única de la regla de literales
src/estilos/guardaLiterales.fixtures.cjs  ejemplos de violación para los tests
src/estilos/guardaLiterales.test.js       contrato, exención efectiva, regla efectiva
src/estilos/tokensGuardHook.test.js       falla cerrada del hook (require() y lectura del archivo)
src/estilos/contraste.test.js             criterio 19: contraste WCAG parseando tokens.css, sin navegador
src/hooks/hooksRequireGuard.test.js       regresión: ningún hook con require() de proyecto fuera de try/catch
.claude/hooks/motor-tests.cjs             bloquea si el motor falla
.claude/hooks/tokens-guard.cjs            delega en guardaLiterales.cjs; falla cerrado
.claude/hooks/fixtures-guard.cjs          protege las fixtures
.claude/hooks/suite-tests.cjs             corre la suite
```

### Verificación de los controles

**Los hooks fueron verificados con roturas deliberadas**, no declarados:

| Fecha | Rotura | Resultado |
|---|---|---|
| 20/07 | Beneficio de 0,35 a 0,50 | 78 tests en rojo |
| 20/07 | Hexadecimal fuera de `tokens.css` | Bloqueado al guardar |
| 20/07 | `#ffffff` dentro de `.claude/hooks/tokens-guard.cjs` | Detectado (antes era punto ciego) |
| 20/07 | `padding: 12px` en un `.cjs` de `src/` | Detectado |
| 20/07 | Entrada nueva en `EXENTOS_COMPLETOS` | Bloqueado por el hook al guardar |
| 21/07 | `tokens-guard.cjs` apuntado a un archivo que no existe (catch silencioso de `fs.readFileSync`) | Bloqueado (antes pasaba sin detectar) |
| 21/07 | `require()` de un módulo del proyecto reintroducido fuera de `try/catch` en una copia de prueba de `tokens-guard.cjs` | Detectado por `hooksRequireGuard.test.js` |

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
6. **Interfaz: Preact con JSX sobre Vite, JavaScript sin TypeScript.** API
   idéntica a React con 3 KB de runtime. Nada de lo ya construido depende del
   framework; reversible a React con un alias en `vite.config.js`. Hooks desde
   `preact/hooks`; en formularios el evento en vivo es `onInput`, no `onChange`.
   Enrutado por hash, escrito a mano, sin librería. Sin librería de estado.
7. **Dispositivo objetivo: Android / Chrome.** Se descarta el riesgo de purga de
   almacenamiento de Safari iOS. Queda el desalojo por presión de espacio,
   mitigado con `navigator.storage.persist()` al instalar.
8. **Host: GitHub Pages**, repo `candelaria`, URL
   `https://<usuario>.github.io/candelaria/`, `base: '/candelaria/'` en Vite,
   publicación por GitHub Actions al hacer push a `main`. El repo es público:
   el `.xlsx` original y los respaldos JSON van en `.gitignore`. El candado de
   origen es reversible vía respaldo JSON (criterio 5); un dominio propio lo
   eliminaría del todo y queda como opción abierta.
9. **Excel: ExcelJS**, no SheetJS. SheetJS gratuito no sombrea celdas ni oculta
   columnas —ambas exigidas por §5.6— y su paquete de npm está congelado.
10. **El guardián de literales tiene una sola implementación**, en
    `src/estilos/guardaLiterales.cjs`, consumida por el hook y por la suite.
    Lista blanca congelada con `Object.freeze` y protegida por un test de
    contrato: ampliarla requiere autorización explícita. Escanea `.css .js .jsx
    .cjs .mjs .html .svg .json`, incluido `.claude/hooks/`.
11. **El hook falla cerrado.** Hasta el 20/07 `tokens-guard.cjs` hacía
    `require()` sin `try/catch`: con el guardián roto, el hook crasheaba sin
    emitir JSON y **la edición pasaba**. Corregido con dos `try/catch` que
    emiten `block`. Estuvo fallando abierto durante toda la Fase 2 y 3a.
12. **`node --test` no escanea directorios que empiezan con punto.** Todo test
    puesto bajo `.claude/` es invisible para `npm test`, pese al comentario de
    `suite-tests.cjs` que afirma lo contrario. **Todos los tests viven bajo
    `src/`.**
13. **`tokens-guard.cjs` tenía un segundo catch silencioso**, en
    `fs.readFileSync` del archivo tocado (no del `require()` del guardián):
    si no podía leer el archivo, la edición pasaba sin revisión. Corregido:
    ahora bloquea. `fixtures-guard.cjs` y `suite-tests.cjs` no tienen el
    defecto original de `tokens-guard.cjs` (no hacen `require()` de ningún
    módulo del proyecto). `src/hooks/hooksRequireGuard.test.js` es la
    regresión que lo blinda hacia adelante en los tres hooks.
14. **Etiquetas de estado: cada estado es un par completo**
    `--color-estado-<x>` / `--color-on-estado-<x>`, nunca un color de estado
    con texto blanco por defecto. `impago` usa `surface-container-highest`
    de fondo, no `outline`: `outline` es un color de borde, DISEÑO § 2 ya lo
    prohíbe como texto o relleno de contenido. Los cinco pares verificados en
    `contraste.test.js`, con assert de ≥ 4,5:1 igual que el resto de los
    pares — ya no es una decisión abierta.

---

## Pendientes anotados

| Pendiente | Cuándo |
|---|---|
| Montar Playwright en Fase 4, no en Fase 6: es la única forma de verificar los criterios 20 y 22 | Fase 4 |
| La herencia de costo (`heredaCostoDe`) está escrita pero **no ejercitada con datos reales**. Los tres productos que la usan pasan por ahí recién en el importador | Fase 5 |
| El exportador a Excel **debe leer con `listarPedidos`**, nunca crudo sobre la tienda de pedidos | Fase 5 |
| ExcelJS necesita `Buffer` en el navegador: verificarlo con la app **compilada**, no solo en el servidor de desarrollo | Fase 5 |
| Verificar que el `.xlsx` original y los respaldos JSON estén en `.gitignore` antes del primer push al repo público | Antes de Fase 6 |
| `scope` y `start_url` del manifest deben incluir `/candelaria/`, y el service worker registrarse con ese scope. Si quedan en `/`, el modo avión falla en silencio | Fase 6 |
| **Borrar toda la base antes de importar la planilla real.** Si quedaron datos de la siembra de desarrollo, se duplican o se pisan sin aviso | Fase 7, antes del paso 20 |
| Revisar el costo de **Bolsa gruesa** (304,17 vs 1.500 forzado) y **Caja exagonal** (sin costo unitario, 2.000 forzado) | Fase 7, tras importar |

---

## Fase 4 — orden de construcción

**Paso 11b, cimientos**, antes de la primera pantalla: `src/config/formato.js`,
`src/persistencia/catalogoRepo.js` (catálogo con costo y precio derivados,
memoizado), `src/desarrollo/siembra.js` (carga las fixtures para poder ver las
pantallas antes de que exista el importador; excluida de la compilación de
producción) y el armazón de enrutado y barra inferior.

| # | Pantalla | DISEÑO |
|---|---|---|
| 1 | Productos (tres solapas) | 8.5 |
| 2 | Ficha de producto | 8.6 |
| 3 | Vender | 8.1 |
| 4 | Pedido (alta y ficha, dos estados) | 8.2 |
| 5 | Mensaje generado | 8.3 |
| 6 | Registro de pago | 8.11 |
| 7 | Pedidos | 8.4 |
| 8 | Alta y edición de insumo | 8.7 |
| 9 | Alta y edición de producto con receta | 8.11 |
| 10 | Alta y edición de combo | 8.11 |
| 11 | Ajustes | 8.8 |
| 12 | Editor de plantillas | 8.9 |

"Revisar importación" (8.10) se construye en la Fase 5, junto al importador.

Cerrar cada pedido de pantalla con: *verificá contra el catálogo sembrado, a
360 px, que ningún importe se parta en dos líneas, ninguna superficie
interactiva mida menos de 48 × 48 px, las listas tengan 96 px de relleno
inferior y el guardián esté en verde. Mostrame la salida.*

---

## Cómo retomar en un chat nuevo

Mensaje de arranque:

```
Leé ESTADO.md. Estoy en [fase]. Acá va la salida de Claude Code: [pegar]
```

No hace falta re-explicar el proyecto: está en los documentos.
