// Punto de entrada de la siembra para el navegador: carga las 3 fixtures
// como asset de Vite y llama a las funciones puras de siembra.js.
//
// Se importa de forma dinámica desde src/interfaz/main.jsx y se ejecuta solo
// cuando las tres tablas del catálogo están completamente vacías.
import textoInsumos from '../../fixtures_insumos.csv?raw';
import textoProductos from '../../fixtures_productos.csv?raw';
import jsonCombos from '../../fixtures_combos.json';
import { construirInsumos, construirProductos, construirCombos, sembrar } from './siembra.js';

export async function sembrarFixtures(db) {
  const insumos = construirInsumos(textoInsumos);
  const productos = construirProductos(textoProductos);
  const codigosProductos = new Set(productos.map((p) => p.codigo));
  const combos = construirCombos(jsonCombos, codigosProductos);
  await sembrar(db, { insumos, productos, combos });
  return { insumos: insumos.length, productos: productos.length, combos: combos.length };
}
