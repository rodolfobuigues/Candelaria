// Encabezado — DISEÑO.md § 7: título en EB Garamond a la izquierda, nada a
// la derecha. `alVolver` (flecha) es para pantallas de detalle; `alCerrar`
// (✕) para pantallas de alta/edición a pantalla completa. Nunca los dos
// juntos.
import { h } from 'preact';

const PROPS_ICONO = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
};

function IconoFlecha() {
  return (
    <svg {...PROPS_ICONO}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

function IconoCerrar() {
  return (
    <svg {...PROPS_ICONO}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function Encabezado({ titulo, alVolver, alCerrar }) {
  return (
    <header class="encabezado">
      {alVolver && (
        <button type="button" class="encabezado__accion" onClick={alVolver} aria-label="Volver">
          <IconoFlecha />
        </button>
      )}
      {alCerrar && (
        <button type="button" class="encabezado__accion" onClick={alCerrar} aria-label="Cerrar">
          <IconoCerrar />
        </button>
      )}
      <h1 class="titulo-l">{titulo}</h1>
    </header>
  );
}
