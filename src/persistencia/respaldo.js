// Exportación e importación del respaldo JSON — ESPECIFICACION.md § 2 y § 5.6.
// Único mecanismo de respaldo real de la app. No confundir con la
// exportación/importación en Excel (mecanismo aparte, no intercambiable).
import { TIENDAS } from './esquema.js';
import { obtenerTodos, guardar, eliminarTodo } from './db.js';
import { listarPedidos, guardarPedido } from './pedidosRepo.js';

export const VERSION_RESPALDO = 1;

export async function exportarRespaldo(db) {
  // listarPedidos() deriva total/pagado/saldo/estadoCobro al leer: nunca
  // están guardados en IndexedDB (ver pedidosRepo.js).
  const [insumos, productos, combos, parametros, pedidos] = await Promise.all([
    obtenerTodos(db, TIENDAS.INSUMOS),
    obtenerTodos(db, TIENDAS.PRODUCTOS),
    obtenerTodos(db, TIENDAS.COMBOS),
    obtenerTodos(db, TIENDAS.PARAMETROS),
    listarPedidos(db),
  ]);

  return {
    version: VERSION_RESPALDO,
    exportadoEn: new Date().toISOString(),
    insumos,
    productos,
    combos,
    parametros,
    pedidos,
  };
}

// Reemplaza toda la base: primero vacía las cinco tiendas, después carga el
// contenido del respaldo. No es un merge — ver tabla comparativa § 5.6.
export async function importarRespaldo(db, respaldo) {
  await Promise.all(Object.values(TIENDAS).map((tienda) => eliminarTodo(db, tienda)));

  await Promise.all([
    ...respaldo.insumos.map((registro) => guardar(db, TIENDAS.INSUMOS, registro)),
    ...respaldo.productos.map((registro) => guardar(db, TIENDAS.PRODUCTOS, registro)),
    ...respaldo.combos.map((registro) => guardar(db, TIENDAS.COMBOS, registro)),
    ...respaldo.parametros.map((registro) => guardar(db, TIENDAS.PARAMETROS, registro)),
    // guardarPedido() despoja los derivados: el JSON exportado los trae
    // (para que el respaldo sea legible), pero no vuelven a IndexedDB.
    ...respaldo.pedidos.map((registro) => guardarPedido(db, registro)),
  ]);
}
