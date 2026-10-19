# Candelaria

PWA para costos, catálogo y pedidos de velas artesanales. Aplicación existente en
[GitHub Pages](https://rodolfobuigues.github.io/Candelaria/), con Supabase como
fuente vigente. Interfaz en castellano rioplatense y moneda argentina.

## Empezar aquí

**Agentes de IA:** leer [AGENTS.md](AGENTS.md), después [ESTADO.md](ESTADO.md).
La ruta de lectura depende de la tarea; no hace falta cargar todo el repositorio
ni todos los documentos históricos en cada sesión.

| Necesidad | Documento |
|---|---|
| Reglas para cualquier agente | [AGENTS.md](AGENTS.md) |
| Estado y última tarea | [ESTADO.md](ESTADO.md) |
| Entender capas, datos y archivos | [Arquitectura](docs/ARQUITECTURA.md) |
| Instalar, aislar pruebas y publicar | [Desarrollo](docs/DESARROLLO.md) |
| Usar catálogo, combos, ventas y respaldos | [Operación](docs/OPERACION.md) |
| Decisiones, diferencias y pendientes | [Continuidad](docs/CONTINUIDAD.md) |
| Requisitos funcionales y aceptación | [ESPECIFICACION.md](ESPECIFICACION.md) |
| Diseño y restricciones visuales | [DISENO.md](DISENO.md); valores en `src/estilos/tokens.css` |
| Base remota, permisos y migraciones | [SUPABASE.md](SUPABASE.md) |
| Evidencia de mejoras del 19/10 | [MEJORAS.md](MEJORAS.md) |
| Entrada compatible con Claude | [CLAUDE.md](CLAUDE.md) |
| Construcción inicial histórica | [PASO_A_PASO.md](PASO_A_PASO.md); no es la instalación actual |

## Las dos carpetas

| Ubicación local | Contenido |
|---|---|
| `D:/Colo/Candelaria` | Código, fuentes funcional/visual, guías, tests y publicación. |
| `D:/Maira/App Velas` | Excel de agosto, DOCX del catálogo, revisión y verificaciones históricas. |

El Excel original no representa el catálogo remoto actual. `fixtures_*` son
datos históricos de prueba; no restaurarlos sobre Supabase. El material privado
de respaldo queda fuera de Git. Las rutas con unidad D son las de esta máquina;
en otro equipo localizar el repositorio y las fuentes sin inventar rutas.

## Arranque técnico

Node.js 24 como en CI. Instalar con `npm ci`. Desarrollo con `npm run dev`,
pero **la presencia de `.env.local` puede conectar localhost a Supabase real**.
Para pruebas aisladas usar el procedimiento de la guía de desarrollo.

```powershell
npm test
npm run build
npm run verificar:build
```

Preact, Vite y JavaScript, rutas hash y fuentes locales. Supabase administra datos
vigentes y fotos; IndexedDB queda para desarrollo sin configuración remota.
Los recursos de producción no deben incluir fixtures privadas.

No hay que volver a instalar SQL para cada cambio de interfaz. Las migraciones
de seguridad y RPC se verificaron instaladas el 19/10/2026. Si una tarea cambia
el contrato de base, revisar SUPABASE y el entorno antes del frontend dependiente.

## Qué no está cerrado

Fotos faltantes, revisión de nombres comerciales, referencias gráficas maestras,
número comercial y prueba física integral en Android. Hay diferencias entre
algunos requisitos originales y controles actuales: están registradas en
CONTINUIDAD para no confundir una especificación con una función ya implementada.
