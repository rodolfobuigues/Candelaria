import { obtenerPorId, guardar } from '../persistencia/db.js';
import { TIENDAS } from '../persistencia/esquema.js';
import { PARAMETROS_INICIALES } from './parametros.js';

export async function obtenerParametrosVigentes(db) {
  const guardados = await obtenerPorId(db, TIENDAS.PARAMETROS, 'actuales');
  return { ...PARAMETROS_INICIALES, ...(guardados ?? {}) };
}

export function guardarParametros(db, parametros) {
  return guardar(db, TIENDAS.PARAMETROS, { id: 'actuales', ...parametros });
}
