// Exportación e importación del respaldo JSON — ESPECIFICACION.md § 2 y § 5.6.
// Único mecanismo de respaldo real de la app. No confundir con la
// exportación/importación en Excel (mecanismo aparte, no intercambiable).
import { TIENDAS } from './esquema.js';
import { obtenerTodos, guardar, eliminarPorId } from './db.js';
import { listarPedidos, guardarPedido } from './pedidosRepo.js';

export const VERSION_RESPALDO = 1;

const COLECCIONES = [
  ['insumos', TIENDAS.INSUMOS, (db, tienda, registro) => guardar(db, tienda, registro)],
  ['productos', TIENDAS.PRODUCTOS, (db, tienda, registro) => guardar(db, tienda, registro)],
  ['combos', TIENDAS.COMBOS, (db, tienda, registro) => guardar(db, tienda, registro)],
  ['parametros', TIENDAS.PARAMETROS, (db, tienda, registro) => guardar(db, tienda, registro)],
  ['pedidos', TIENDAS.PEDIDOS, (db, _tienda, registro) => guardarPedido(db, registro)],
];

export function validarRespaldo(respaldo) {
  if (!respaldo || typeof respaldo !== 'object') throw new Error('El respaldo no contiene un objeto válido.');
  if (respaldo.version !== VERSION_RESPALDO) throw new Error(`La versión del respaldo debe ser ${VERSION_RESPALDO}.`);

  for (const [clave] of COLECCIONES) {
    const registros = respaldo[clave];
    if (!Array.isArray(registros)) throw new Error(`El respaldo no contiene la colección ${clave}.`);
    const ids = new Set();
    for (const [indice, registro] of registros.entries()) {
      if (!registro || typeof registro !== 'object' || !String(registro.id ?? '').trim()) {
        throw new Error(`${clave}, registro ${indice + 1}: falta un identificador válido.`);
      }
      const id = String(registro.id);
      if (ids.has(id)) throw new Error(`${clave}: el identificador ${id} está duplicado.`);
      ids.add(id);
    }
  }
  return respaldo;
}

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

async function aplicarRespaldo(db, respaldo) {
  // Primero se crean o actualizan todos los registros. Ninguna colección se
  // vacía por adelantado, así una falla temprana no deja la base en blanco.
  for (const [clave, tienda, guardarRegistro] of COLECCIONES) {
    for (const registro of respaldo[clave]) await guardarRegistro(db, tienda, registro);
  }

  // Solo después de completar todos los guardados se quitan los registros que
  // no pertenecen al respaldo seleccionado.
  for (const [clave, tienda] of COLECCIONES) {
    const idsDestino = new Set(respaldo[clave].map((registro) => String(registro.id)));
    const actuales = await obtenerTodos(db, tienda);
    for (const registro of actuales) {
      if (!idsDestino.has(String(registro.id))) await eliminarPorId(db, tienda, registro.id);
    }
  }
}

// Reemplaza la base sin vaciarla primero. Conserva una copia en memoria y, si
// algún guardado o borrado falla, intenta volver automáticamente al estado
// original antes de informar el error.
export async function importarRespaldo(db, respaldo) {
  validarRespaldo(respaldo);
  const original = await exportarRespaldo(db);
  try {
    await aplicarRespaldo(db, respaldo);
  } catch (errorImportacion) {
    try {
      await aplicarRespaldo(db, original);
    } catch (errorRecuperacion) {
      throw new Error(`La importación falló (${errorImportacion.message}) y la recuperación automática también falló (${errorRecuperacion.message}). Conservá el respaldo previo descargado.`);
    }
    throw new Error(`La importación falló y se restauró el estado anterior: ${errorImportacion.message}`);
  }
}
