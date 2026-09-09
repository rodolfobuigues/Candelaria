import { sembrarFixtures } from './siembraFixtures.js';
import { abrirDB, obtenerTodos } from '../persistencia/db.js';
import { TIENDAS } from '../persistencia/esquema.js';

// Carga una única vez la fuente vigente del 18/08/26 cuando el catálogo aún
// está vacío o quedó incompleto antes de comenzar a registrar pedidos.
export async function cargarFuenteInicialSiHaceFalta() {
  const db = await abrirDB();
  const [insumos, productos, combos, pedidos] = await Promise.all([
    obtenerTodos(db, TIENDAS.INSUMOS),
    obtenerTodos(db, TIENDAS.PRODUCTOS),
    obtenerTodos(db, TIENDAS.COMBOS),
    obtenerTodos(db, TIENDAS.PEDIDOS),
  ]);
  const nombresFijos = new Set(insumos.map((insumo) => insumo.nombre?.trim().toLowerCase()));
  const faltanInsumosFijos = [
    ['cera alto pf'],
    ['cera bajo pf'],
    ['pabilo'],
    ['yeso'],
    ['esencia', 'escencia'],
    ['colorante'],
    ['aceite de coco'],
  ].some((candidatos) => !candidatos.some((nombre) => nombresFijos.has(nombre)));

  if (insumos.length === 0 && productos.length === 0 && combos.length === 0) {
    return sembrarFixtures(db);
  }
  if (pedidos.length === 0 && faltanInsumosFijos) {
    return sembrarFixtures(db);
  }
  return { insumos: insumos.length, productos: productos.length, combos: combos.length, sembrado: false };
}
