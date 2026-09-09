// Reglas de redondeo de precios de venta.
// Hasta $1.000 se usa el múltiplo de $10 más cercano; por encima de $1.000
// se redondea siempre hacia arriba al múltiplo de $100.
export function redondearPrecioVenta(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) return 0;
  const multiplo = numero > 1000 ? 100 : 10;
  return numero > 1000
    ? Math.ceil(numero / multiplo) * multiplo
    : Math.round(numero / multiplo) * multiplo;
}
