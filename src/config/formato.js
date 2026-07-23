// Formato centralizado — ESPECIFICACION.md § 6, CLAUDE.md "Idioma y formato".
// Única implementación de moneda y fecha: ninguna pantalla formatea a mano.
//
// Intl con locale 'es-AR' y currency 'ARS' ya produce exactamente el formato
// exigido — punto de miles, coma decimal, y un espacio duro (U+00A0) real
// entre el símbolo y el número — sin tener que reimplementar agrupamiento ni
// separadores a mano. Se fijan las opciones explícitas (no el locale por
// defecto del entorno) para que el resultado no dependa de dónde corra.

const LOCALE = 'es-AR';
const MONEDA = 'ARS';

function formatearImporteConDecimales(monto, decimales) {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: MONEDA,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(monto);
}

// Catálogo y pedidos: sin decimales (ESPECIFICACION.md § 6).
export function formatearImporte(monto) {
  return formatearImporteConDecimales(monto, 0);
}

// Desglose de receta y costo unitario de insumo: dos decimales.
export function formatearCostoUnitario(monto) {
  return formatearImporteConDecimales(monto, 2);
}

export function formatearFecha(fecha) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha));
}

// 24 h siempre: hour12 fijado a false explícitamente, no dejado al locale.
export function formatearFechaHora(fecha) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(fecha));
}
