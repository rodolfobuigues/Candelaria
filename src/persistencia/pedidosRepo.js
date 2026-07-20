// Capa de lectura/escritura de pedidos — ESPECIFICACION.md § 3.5.
//
// total, pagado, saldo y estadoCobro son derivados de verdad: NUNCA se
// guardan en IndexedDB. Se calculan con calcularDerivados() cada vez que
// se lee un pedido, para que no puedan desincronizarse de `lineas` y
// `pagos`. Este módulo es el único camino sancionado para leer o guardar
// pedidos — la lista de pedidos, la ficha, la exportación a Excel y el
// respaldo JSON deben pasar por acá, nunca por obtenerTodos/obtenerPorId/
// guardar de db.js directamente sobre TIENDAS.PEDIDOS.
import { TIENDAS } from './esquema.js';
import { obtenerTodos, obtenerPorId, guardar } from './db.js';
import { calcularDerivados } from './pedidoLogica.js';

function conDerivados(pedido) {
  return pedido ? { ...pedido, ...calcularDerivados(pedido) } : pedido;
}

export async function obtenerPedido(db, id) {
  return conDerivados(await obtenerPorId(db, TIENDAS.PEDIDOS, id));
}

export async function listarPedidos(db) {
  const pedidos = await obtenerTodos(db, TIENDAS.PEDIDOS);
  return pedidos.map(conDerivados);
}

// Despoja total/pagado/saldo/estadoCobro antes de persistir, aunque el
// objeto los traiga pegados (p. ej. por venir de una lectura previa o de
// un respaldo JSON exportado).
export function guardarPedido(db, pedido) {
  const { total, pagado, saldo, estadoCobro, ...paraPersistir } = pedido;
  return guardar(db, TIENDAS.PEDIDOS, paraPersistir);
}
