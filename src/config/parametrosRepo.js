import { obtenerPorId, guardar } from '../persistencia/db.js';
import { TIENDAS } from '../persistencia/esquema.js';
import { PARAMETROS_INICIALES } from './parametros.js';
import { validarParametros } from '../persistencia/validacionDominio.js';

export async function obtenerParametrosVigentes(db) {
  const guardados = await obtenerPorId(db, TIENDAS.PARAMETROS, 'actuales');
  return { ...PARAMETROS_INICIALES, ...(guardados ?? {}) };
}

export async function guardarParametros(db, parametros) {
  const actuales = await obtenerParametrosVigentes(db);
  const completos = validarParametros({ ...actuales, ...parametros });
  return guardar(db, TIENDAS.PARAMETROS, { ...completos, id: 'actuales' });
}
