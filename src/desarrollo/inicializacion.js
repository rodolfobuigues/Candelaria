import { abrirDB, obtenerTodos } from '../persistencia/db.js';
import { TIENDAS } from '../persistencia/esquema.js';
import { supabaseConfigurado } from '../config/supabase.js';

export function resumirErrorInicializacion(error) {
  const mensaje = error?.message ?? String(error);
  const codigo = error?.code ? ` (${error.code})` : '';
  return `${mensaje}${codigo}`;
}

// Consulta el origen vigente sin alterar Supabase. Sólo el desarrollo local
// completamente vacío puede cargar las fixtures históricas.
export async function cargarFuenteInicialSiHaceFalta() {
  const db = await abrirDB();
  const [insumos, productos, combos, pedidos] = await Promise.all([
    obtenerTodos(db, TIENDAS.INSUMOS),
    obtenerTodos(db, TIENDAS.PRODUCTOS),
    obtenerTodos(db, TIENDAS.COMBOS),
    obtenerTodos(db, TIENDAS.PEDIDOS),
  ]);
  if (supabaseConfigurado) {
    return { insumos: insumos.length, productos: productos.length, combos: combos.length, sembrado: false, fuente: 'Supabase' };
  }
  if (import.meta.env.DEV && insumos.length === 0 && productos.length === 0 && combos.length === 0 && pedidos.length === 0) {
    const { sembrarFixtures } = await import('./siembraFixtures.js');
    return sembrarFixtures(db);
  }
  return { insumos: insumos.length, productos: productos.length, combos: combos.length, sembrado: false };
}
