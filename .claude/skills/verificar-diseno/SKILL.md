---
name: verificar-diseno
description: Revisa en navegador desbordes, tamaños táctiles, foco y composición del flujo modificado de Candelaria.
---

# Verificación visual

Entrada común: [AGENTS.md](../../../AGENTS.md). Diseño:
[DISENO.md](../../../DISENO.md). Aislamiento y comandos:
[DESARROLLO.md](../../../docs/DESARROLLO.md).

## Fuentes y alcance

Revisar el diff y la pantalla afectada. Aplicar las actualizaciones autorizadas
del diseño, no una captura o fase antigua sobre la versión nueva. Sólo tema
claro, fuentes locales y tokens centralizados. No inventar otra paleta.

## Pruebas existentes

La suite cubre literales/fuentes, contrato del guardián y contraste. Si un cambio
introduce otro par fondo/texto, comprobarlo en el mecanismo existente. No crear
una segunda fórmula de contraste ni cambiar la lista blanca para pasar un caso.
Una suite aprobada no acredita accesibilidad integral.

## Pruebas en navegador

- Confirmar que el origen está aislado antes de introducir registros de prueba.
- Medir desborde con documentElement.clientWidth y scrollWidth.
- Revisar 360/480/640/1024 px cuando el cambio afecte composición adaptable.
- Medir superficies interactivas reales, de al menos 48 por 48 px.
- Comprobar nombres largos e importes sin partir y que el último control sea
  visible con encabezado, carrito o barra inferior presentes.
- En formularios comprobar cierre, guarda de cambios y ausencia de barra inferior.
- Recorrer teclado y foco; en galería, apertura, Tab, Escape y retorno de foco.
- Revisar estados vacío/carga/error y reintento sin pérdida ni doble guardado.

Usar el navegador y herramientas permitidos en el entorno. No suponer que hay
Playwright, dispositivo Android o lector de pantalla disponibles. Si no puede
hacerse un control, registrarlo como pendiente. No sustituir medición por CSS,
jsdom o una afirmación del informe anterior.

## Reporte

Indicar caso probado, origen sin credenciales expuestas, ancho y medidas,
resultado y pendientes. Reportar archivo/selector de un fallo concreto.
No prometer publicación ni certificar Android físico por una captura emulada.
