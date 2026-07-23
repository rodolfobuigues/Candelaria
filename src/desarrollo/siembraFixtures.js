// Punto de entrada de la siembra para el navegador: carga las 3 fixtures
// como asset de Vite y llama a las funciones puras de siembra.js.
//
// Solo se importa de forma DINÁMICA, detrás de `import.meta.env.DEV`, desde
// src/interfaz/main.jsx. Así Vite excluye este archivo — y las fixtures que
// importa — del bundle de producción (verificado en dist/, no solo leído en
// el código: ver ESTADO.md).
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
