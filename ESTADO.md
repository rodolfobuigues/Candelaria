# Candelaria — Estado del proyecto

**Actualizado: 23/07/2026**

Documento vivo. Se actualiza al cerrar cada fase. Es lo primero que hay que leer
al abrir un chat nuevo.

---

## Dónde estoy

| | |
|---|---|
| Carpeta | `D:\Colo\Candelaria` |
| Repositorio | git iniciado. Último commit registrado: `f28bbc0` (armazón de interfaz), más el commit del reporter `dot` |
| Tests | **179 en verde**, 25 suites, 0 fallos |
| Fase actual | **Fase 4 en curso.** Paso 11b (cimientos) cerrado |
| Próximo paso | Pantalla 1 de 12: **Productos** (DISEÑO 8.5) |
| Sin commitear | Nada pendiente |

---

## Fases

| Fase | Estado | Detalle |
|---|---|---|
| 0 — Preparación | ✅ | Node 24.16, Claude Code 2.1.210, git, `.gitignore` |
| 1 — Reglas y `CLAUDE.md` | ✅ | Resueltas 5 contradicciones entre documentos |
| 2 — Motor de cálculo | ✅ | 76 productos, 26 insumos y 2 combos validados contra las fixtures |
| 3a — Persistencia | ✅ | IndexedDB, respaldo JSON, pagos e historial |
| 3b — Tokens de estilo | ✅ | Tokens, componentes, fuentes locales y guardián con 4 tests de control |
| 4 — Interfaz | 🔄 | **Cimientos ✅. 0 de 12 pantallas** |
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
src/config/formato.js                     moneda, decimales, fechas — única implementación
src/config/formato.test.js
src/persistencia/esquema.js               tiendas de IndexedDB
src/persistencia/db.js                    adaptador CRUD
src/persistencia/pedidoLogica.js          funciones puras de pedido
src/persistencia/pedidosRepo.js           lectura con derivados
src/persistencia/respaldo.js              exportar/importar JSON
src/persistencia/catalogoRepo.js          catálogo con costo y precio derivados, memoizado
src/persistencia/catalogoRepo.test.js
src/desarrollo/siembra.js                 carga las fixtures en IndexedDB (solo desarrollo)
src/desarrollo/siembraFixtures.js
src/desarrollo/siembra.test.js
src/estilos/tokens.css                    DISEÑO 2, 3 y 4 + 7 tokens dimensionales + @font-face
src/estilos/componentes.css               componentes de DISEÑO 6 + estructura común 7
src/estilos/fuentes/                      eb-garamond-500 y plus-jakarta-sans 400/500/600/700 + OFL
src/estilos/guardaLiterales.cjs           implementación única de la regla de literales
src/estilos/guardaLiterales.fixtures.cjs  ejemplos de violación para los tests
src/estilos/guardaLiterales.test.js       contrato, exención efectiva, regla efectiva
src/estilos/tokensGuardHook.test.js       falla cerrada del hook
src/estilos/contraste.test.js             criterio 19, sin navegador
src/hooks/hooksRequireGuard.test.js       ningún require() de proyecto fuera de try/catch
src/interfaz/main.jsx                     punto de entrada
src/interfaz/App.jsx
src/interfaz/enrutador.js                 hash, escrito a mano sobre hashchange
src/interfaz/comun/BarraInferior.jsx
src/interfaz/comun/Encabezado.jsx
index.html
vite.config.js                            base: '/candelaria/'
.claude/hooks/motor-tests.cjs             bloquea si el motor falla
.claude/hooks/tokens-guard.cjs            delega en guardaLiterales.cjs; falla cerrado
.claude/hooks/fixtures-guard.cjs          protege las fixtures
.claude/hooks/suite-tests.cjs             corre la suite con reporter dot
.claude/skills/nueva-pantalla/SKILL.md    corregida: 12 pantallas, reglas de Preact
.claude/skills/verificar-diseno/SKILL.md  corregida: no duplica contraste, mide en navegador
.claude/agents/revisor-diseno.md          corregido: lee DISEÑO §6 y formato de moneda
.mcp.json                                 servidor de Playwright (conservado para Fase 4)
```

### Verificación de los controles

**Los hooks fueron verificados con roturas deliberadas**, no declarados:

| Fecha | Rotura | Resultado |
|---|---|---|
| 20/07 | Beneficio de 0,35 a 0,50 | 78 tests en rojo |
| 20/07 | Hexadecimal fuera de `tokens.css` | Bloqueado al guardar |
| 20/07 | `#ffffff` dentro de `.claude/hooks/tokens-guard.cjs` | Detectado |
| 20/07 | `padding: 12px` en un `.cjs` de `src/` | Detectado |
| 20/07 | Entrada nueva en `EXENTOS_COMPLETOS` | Bloqueado por el hook al guardar |
| 23/07 | `/* #ffffff */` en `.claude/hooks/fixtures-guard.cjs` | `fail 1` — punto ciego de `.cjs` confirmado cerrado |

### Verificación visual del armazón — 23/07

A 360 px de ancho, medido en el navegador con `getBoundingClientRect()`:

| Elemento | Medida | Mínimo | Resultado |
|---|---|---|---|
| Las cuatro pestañas de la barra inferior | 88 × 55 px | 48 × 48 px | ✅ |
| Rótulos Vender · Pedidos · Productos · Ajustes | Sin corte ni superposición | | ✅ |
| Fuentes | EB Garamond y Plus Jakarta Sans cargan | | ✅ |
| Ruta base | `http://localhost:5173/candelaria/` | | ✅ |

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
   a `RP150`, `RP50`, `RP170`. La siembra de desarrollo **no** los renombra: esa
   regla es del importador, no de la siembra.
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
    emitir JSON y **la edición pasaba**. Corregido con `try/catch` que emiten
    `block`, incluido el caso de no poder leer el archivo tocado.
12. **`node --test` no escanea directorios que empiezan con punto.** Todo test
    puesto bajo `.claude/` es invisible para `npm test`. **Todos los tests viven
    bajo `src/`.**
13. **Las etiquetas de estado usan pares fondo/texto.** Cada
    `--color-estado-<x>` tiene su `--color-on-estado-<x>`. Ninguna hardcodea
    texto blanco. `impago` dejó de apuntar a `outline` —que es color de borde,
    no de relleno— y pasó a píldora neutra clara. Los cinco pares están
    asertados a ≥ 4,5:1 en `contraste.test.js`.
14. **`catalogoRepo` no detecta cambios de insumo por sí solo.** Invalida al
    cambiar un parámetro global; para un insumo hace falta llamar a
    `invalidarCatalogo()` explícitamente. Está asertado en un test, no
    escondido.
15. **`suite-tests.cjs` no dispara con `.jsx`**, solo con `.js` y `.cjs` bajo
    `src/`. Es deliberado: no hay tests de componentes que correr, y disparar
    179 tests por cada guardado de pantalla no aporta. El control de la Fase 4
    es `tokens-guard.cjs`, que sí escanea `.jsx`.
16. **Reporter `dot`** en `npm test` y en el hook, para no volcar 179 líneas al
    contexto en cada corrida. El detalle sale con `npm run test:detalle`.

---

## Pendientes anotados

| Pendiente | Cuándo |
|---|---|
| **Toda ruta que cree, edite o desactive un insumo debe llamar a `invalidarCatalogo()`.** El catálogo memoizado no lo detecta solo | Fase 4, pantalla 8 |
| Verificar cada pantalla a 360 px en DevTools con `console.table`: ancho y alto ≥ 48 px, ningún rótulo cortado, ningún importe partido | Fase 4, cada pantalla |
| La herencia de costo (`heredaCostoDe`) está escrita pero **no ejercitada con datos reales**. Los tres productos que la usan pasan por ahí recién en el importador | Fase 5 |
| El exportador a Excel **debe leer con `listarPedidos`**, nunca crudo sobre la tienda de pedidos | Fase 5 |
| ExcelJS necesita `Buffer` en el navegador: verificarlo con la app **compilada**, no solo en el servidor de desarrollo | Fase 5 |
| Verificar que el `.xlsx` original y los respaldos JSON estén en `.gitignore` antes del primer push al repo público | Antes de Fase 6 |
| `scope` y `start_url` del manifest deben incluir `/candelaria/`, y el service worker registrarse con ese scope. Si quedan en `/`, el modo avión falla en silencio | Fase 6 |
| **Borrar toda la base antes de importar la planilla real.** Si quedaron datos de la siembra de desarrollo, se duplican o se pisan sin aviso | Fase 7, antes del paso 20 |
| Revisar el costo de **Bolsa gruesa** (304,17 vs 1.500 forzado) y **Caja exagonal** (sin costo unitario, 2.000 forzado) | Fase 7, tras importar |

---

## Fase 4 — orden de construcción

**Paso 11b, cimientos: ✅ cerrado.** `formato.js`, `catalogoRepo.js`,
`siembra.js`, y el armazón con enrutado por hash y barra inferior.

| # | Pantalla | DISEÑO | Estado |
|---|---|---|---|
| 1 | Productos (tres solapas) | 8.5 | ⬜ |
| 2 | Ficha de producto | 8.6 | ⬜ |
| 3 | Vender | 8.1 | ⬜ |
| 4 | Pedido (alta y ficha, dos estados) | 8.2 | ⬜ |
| 5 | Mensaje generado | 8.3 | ⬜ |
| 6 | Registro de pago | 8.11 | ⬜ |
| 7 | Pedidos | 8.4 | ⬜ |
| 8 | Alta y edición de insumo | 8.7 | ⬜ |
| 9 | Alta y edición de producto con receta | 8.11 | ⬜ |
| 10 | Alta y edición de combo | 8.11 | ⬜ |
| 11 | Ajustes | 8.8 | ⬜ |
| 12 | Editor de plantillas | 8.9 | ⬜ |

"Revisar importación" (8.10) se construye en la Fase 5, junto al importador.

---

## Cómo trabajar para gastar menos crédito

División de tareas, decidida el 23/07:

| Tarea | Quién |
|---|---|
| Diagnóstico: `git status`, `npm test`, `findstr`, `npm run build` | El dueño, en PowerShell |
| Verificación visual a 360 px con DevTools | El dueño |
| Decidir, revisar salidas, redactar documentos | El chat de Claude |
| Código que necesita iterar contra un test hasta que pase | Claude Code |

Reglas:

- **Una pantalla por sesión.** Cerrar y reabrir Claude Code entre pantallas: el
  contexto acumulado se paga en cada mensaje.
- **Nunca pedirle diagnóstico** a Claude Code. Los comandos los corre el dueño y
  le pega solo la línea que importa.
- **No pedirle que verifique a 360 px.** Eso lo hace el dueño en DevTools.
- **Sonnet por defecto**, Opus solo para decisiones de arquitectura.
- **Pedirle secciones, no documentos:** "leé DISEÑO §8.5", nunca "leé
  DISEÑO.md".
- **Editar a mano no dispara los hooks.** Después de cualquier edición desde
  VS Code, correr `npm test` a mano.

---

## Cómo retomar en un chat nuevo

Mensaje de arranque:

```
Leé ESTADO.md. Estoy en [fase]. Acá va la salida de Claude Code: [pegar]
```

No hace falta re-explicar el proyecto: está en los documentos.
