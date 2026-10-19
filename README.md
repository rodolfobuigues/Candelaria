# Candelaria

Aplicación móvil para costos, catálogo y pedidos de velas artesanales.

| Fuente | Responsabilidad |
|---|---|
| [ESPECIFICACION.md](ESPECIFICACION.md) | Alcance funcional y aceptación. |
| [DISENO.md](DISENO.md) | Diseño; tokens efectivos en `src/estilos/tokens.css`. |
| [CLAUDE.md](CLAUDE.md) | Reglas de trabajo e invariantes. |
| [ESTADO.md](ESTADO.md) | Verificaciones históricas. |
| [MEJORAS.md](MEJORAS.md) | Cambios del 19/10/2026, evidencia y pendientes actuales. |
| [SUPABASE.md](SUPABASE.md) | Instalación, migraciones y permisos. |

Instalar con `npm ci`. Desarrollo: `npm run dev`. Pruebas: `npm test`.
Producción: `npm run build` y `npm run verificar:build`.

Preact, Vite y JavaScript; fuentes locales. Supabase administra los datos vigentes.
Las fixtures históricas no se empaquetan en producción.

Fuentes del negocio: `D:/Maira/App Velas`. Incluyen Excel histórico, documentos del
catálogo e informe de revisión. No son una segunda base vigente.

Instalar las migraciones de esta versión antes de publicar el frontend.
