// Barra inferior de cuatro pestañas — DISEÑO.md § 6 y § 7, CLAUDE.md
// "Navegación única". Nunca menú hamburguesa. Píldora de pestaña activa con
// los tokens de DISEÑO.md § 2.
import { h } from 'preact';
import { useRuta } from '../enrutador.js';

// Íconos de trazo, 24 px, extremos y esquinas redondeadas (DISEÑO.md § 6).
// `currentColor` para heredar el color de texto ya resuelto por CSS —
// ningún color literal acá.
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

function IconoVender() {
  return (
    <svg {...PROPS_ICONO}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconoPedidos() {
  return (
    <svg {...PROPS_ICONO}>
      <path d="M8 2h8l1 4H7l1-4Z" />
      <rect x="4" y="6" width="16" height="16" rx="2" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

function IconoProductos() {
  return (
    <svg {...PROPS_ICONO}>
      <path d="M3 8 12 3l9 5-9 5-9-5Z" />
      <path d="M3 8v9l9 5 9-5V8" />
      <path d="M12 13v9" />
    </svg>
  );
}

function IconoAjustes() {
  return (
    <svg {...PROPS_ICONO}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

const PESTANAS = [
  { ruta: 'vender', etiqueta: 'Vender', Icono: IconoVender },
  { ruta: 'pedidos', etiqueta: 'Pedidos', Icono: IconoPedidos },
  { ruta: 'productos', etiqueta: 'Productos', Icono: IconoProductos },
  { ruta: 'ajustes', etiqueta: 'Ajustes', Icono: IconoAjustes },
];

export function BarraInferior() {
  const rutaActual = useRuta();

  return (
    <nav class="barra-inferior">
      {PESTANAS.map(({ ruta, etiqueta, Icono }) => (
        <a key={ruta} href={`#/${ruta}`} aria-current={rutaActual === ruta ? 'page' : undefined}>
          <span class="pildora">
            <Icono />
          </span>
          <span>{etiqueta}</span>
        </a>
      ))}
    </nav>
  );
}
