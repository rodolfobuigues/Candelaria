# Candelaria: entrada para Claude

La guía común y vigente para agentes está en [AGENTS.md](AGENTS.md). Leerla al
comenzar, junto con [README.md](README.md) y [ESTADO.md](ESTADO.md). No mantener
otra copia de invariantes o una secuencia de construcción inicial en este archivo.

- Requisitos: [ESPECIFICACION.md](ESPECIFICACION.md).
- Diseño: [DISENO.md](DISENO.md), sin tilde en el nombre del archivo.
- Desarrollo, operación y arquitectura: guías enlazadas desde README.
- Decisiones y diferencias conocidas: [CONTINUIDAD.md](docs/CONTINUIDAD.md).

Los hooks de `.claude/settings.json` protegen fixtures y tokens y ejecutan la
suite al editar con las herramientas compatibles. No deshabilitarlos para
hacer pasar un cambio. Otros agentes deben ejecutar las verificaciones aplicables
por su cuenta; la existencia de estos hooks no prueba que hayan corrido.

Las skills y el revisor en `.claude` son ayudas de esa herramienta. No agregan
requisitos de negocio ni autorizan operaciones remotas. La aplicación ya está
publicada y usa Supabase; no reconstruirla desde PASO_A_PASO ni reimportar el Excel.
