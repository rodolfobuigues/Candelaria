# Candelaria — Estado del proyecto

**Actualizado: 14/09/2026**

Documento vivo. Se actualiza al cerrar cada fase. Es lo primero que hay que leer
al abrir un chat nuevo.

---

## Dónde estoy

| | |
|---|---|
| Carpeta | `D:\Colo\Candelaria` |
| Repositorio | `https://github.com/rodolfobuigues/Candelaria.git`, rama `main` |
| Publicación | `https://rodolfobuigues.github.io/Candelaria/`, despliegue automático por GitHub Actions |
| Tests | `npm test` en verde el 14/09/2026 |
| Compilación | `npm run build` correcta el 14/09/2026 |
| Estado actual | Catálogo, costos, pedidos, mensajes, fotos y ajustes conectados a Supabase |
| Próximo paso | Completar la instalación PWA y su validación real en Android |

### Fuente de datos vigente

La única fuente de datos inicial válida es `D:\Maira\App Velas\Velas y adornos Candelaria 18-8-26.xlsx`.
Las fixtures del repositorio fueron regeneradas desde esa versión: 29 insumos,
79 productos y 21 combos. Se excluyeron los combos vacíos 24 y 25 y los
duplicados exactos 6 (igual al 4) y 22 (igual al 14). No se mezclaron datos de
la planilla anterior.

Desde el 14/09/2026, Supabase es la fuente vigente del catálogo. Las cantidades
anteriores son solo referencia histórica y no deben validarse como límites ni
usarse para sobrescribir el catálogo remoto.

---

## Fases

| Fase | Estado | Detalle |
|---|---|---|
| 0 — Preparación | ✅ | Node 24.16, Claude Code 2.1.210, git, `.gitignore` |
| 1 — Reglas y `CLAUDE.md` | ✅ | Resueltas 5 contradicciones entre documentos |
| 2 — Motor de cálculo | ✅ | 79 productos, 29 insumos y 21 combos vigentes validados contra las fixtures del Excel 18/08/2026 |
| 3a — Persistencia | ✅ | IndexedDB, respaldo JSON, pagos e historial |
| 3b — Tokens de estilo | ✅ | Tokens, componentes, fuentes locales y guardián con 4 tests de control |
| 4 — Interfaz | ✅ | **Cimientos ✅. 12 de 12 pantallas** |
| 5 — Importador y Excel | 🔄 | Respaldo JSON seguro, CSV y lector inicial de planilla XLSX; falta completar la previsualización y aplicación validada de XLSX |
| 6 — PWA publicada | 🔄 | GitHub Pages activo, iconos instalables, actualización controlada y persistencia local; falta validación final desde Android físico |
| 7 — Supabase | ✅ | Autenticación, tablas, RLS y catálogo remoto vigentes |
| 8 — Endurecimiento | 🔄 | Correcciones de pedidos, navegación, mensajes, restauración protegida y transición de fotos a Storage |
| 9 — Catálogo público | ✅ | Proyección pública exclusiva de combos; recetas, costos, pedidos y ajustes requieren autenticación |

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
src/persistencia/catalogoPublicoRepo.js   proyección comercial de combos sin recetas ni costos
src/persistencia/importadorFuente.js      conversión exclusiva del Excel vigente 18/08/2026
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
7. **Dispositivo objetivo: Android / Chrome.** Supabase es la fuente vigente;
   IndexedDB queda como alternativa cuando el entorno no tiene Supabase
   configurado. Falta solicitar persistencia local con
   `navigator.storage.persist()` y verificar la instalación real en Android.
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
17. **Supabase es la única fuente vigente del catálogo.** Las cantidades de las
    fixtures del Excel son históricas y no se usan para resembrar ni limitar los
    registros remotos. Las fotos nuevas se guardan en Storage y las antiguas en
    Base64 se migran desde Ajustes con revisión y confirmación explícitas.
18. **La restauración JSON no vacía las tablas por adelantado.** Valida el
    archivo, descarga una copia previa, guarda primero el contenido de destino,
    elimina después únicamente los identificadores sobrantes y trata de
    restaurar automáticamente el estado original ante una falla.
19. **El catálogo público no consulta `productos` ni `combos` directamente.**
    Lee `catalogo_publico_combos`, una proyección con nombre, descripción,
    precio y fotos. El panel autenticado la sincroniza con el motor vigente al
    iniciar sesión y después de cada cambio que afecta precios o contenido.

---

## Pendientes anotados

| Pendiente | Cuándo |
|---|---|
| Ejecutar desde Ajustes la revisión de fotos Base64 y, si el resultado es correcto, iniciar la migración resumible a Storage | Operación manual del creador |
| Verificar instalación, navegación, fotos y actualización desde Android sobre GitHub Pages | Validación final PWA |
| Completar la previsualización y aplicación validada del importador XLSX sin sobrescribir silenciosamente datos remotos | Importación |
| No corregir materiales sin costo o fórmulas dudosas sin consulta previa | Regla permanente |

---

## Fase 4 — orden de construcción

**Paso 11b, cimientos: ✅ cerrado.** `formato.js`, `catalogoRepo.js`,
`siembra.js`, y el armazón con enrutado por hash y barra inferior.

| # | Pantalla | DISEÑO | Estado |
|---|---|---|---|
| 1 | Productos (tres solapas) | 8.5 | ✅ |
| 2 | Ficha de producto | 8.6 | ✅ |
| 3 | Vender | 8.1 | ✅ |
| 4 | Pedido (alta y ficha, dos estados) | 8.2 | ✅ |
| 5 | Mensaje generado | 8.3 | ✅ |
| 6 | Registro de pago | 8.11 | ✅ |
| 7 | Pedidos | 8.4 | ✅ |
| 8 | Alta y edición de insumo | 8.7 | ✅ |
| 9 | Alta y edición de producto con receta | 8.11 | ✅ |
| 10 | Alta y edición de combo | 8.11 | ✅ |
| 11 | Ajustes | 8.8 | ✅ |
| 12 | Editor de plantillas | 8.9 | ✅ |

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
