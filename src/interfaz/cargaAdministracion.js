import { obtenerTodos } from '../persistencia/db.js';
import { TIENDAS } from '../persistencia/esquema.js';
import { obtenerCatalogo } from '../persistencia/catalogoRepo.js';
import { obtenerParametrosVigentes } from '../config/parametrosRepo.js';

// Los datos para reparar insumos no dependen de poder calcular las recetas.
export async function cargarAdministracion(db) {
  const [catalogo, insumos] = await Promise.allSettled([
    obtenerParametrosVigentes(db).then((parametros) => obtenerCatalogo(db, parametros)),
    obtenerTodos(db, TIENDAS.INSUMOS),
  ]);
  const errores = [];
  if (catalogo.status === 'rejected') errores.push(`No se pudieron calcular productos y combos: ${catalogo.reason.message}. Revisá los insumos para repararlo.`);
  if (insumos.status === 'rejected') errores.push(`No se pudieron cargar los insumos: ${insumos.reason.message}.`);
  return {
    datos: {
      productos: catalogo.status === 'fulfilled' ? catalogo.value.productos : [],
      combos: catalogo.status === 'fulfilled' ? catalogo.value.combos : [],
      insumos: insumos.status === 'fulfilled' ? insumos.value : [],
      calculado: catalogo.status === 'fulfilled',
    },
    error: errores.length ? errores.join(' ') : null,
  };
}
