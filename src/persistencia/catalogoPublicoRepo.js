import { supabase, supabaseConfigurado } from '../config/supabase.js';
import { obtenerParametrosVigentes } from '../config/parametrosRepo.js';
import { obtenerCatalogo, invalidarCatalogo } from './catalogoRepo.js';
import { obtenerTodos } from './db.js';
import { TIENDAS } from './esquema.js';

const TABLA = 'catalogo_publico_combos';

function formatearCantidad(cantidad) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(cantidad));
}

function esUrlPublica(foto) {
  return /^https:\/\//i.test(String(foto ?? ''));
}

export function construirCatalogoPublico(catalogo, insumos) {
  const productosPorId = new Map(catalogo.productos.map((producto) => [String(producto.id), producto]));
  const insumosPorId = new Map(insumos.map((insumo) => [String(insumo.id), insumo]));
  return catalogo.combos.map((combo) => ({
    id: String(combo.id),
    nombre: combo.nombre,
    descripcion: combo.lineas.map((linea) => {
      const componente = productosPorId.get(String(linea.refId)) ?? insumosPorId.get(String(linea.refId));
      return `${formatearCantidad(linea.cantidad)} × ${componente?.nombre ?? linea.refId}`;
    }).join(', '),
    precio: Number(combo.precioCombo),
    // No duplica imágenes Base64 en la tabla pública. Esas fotos aparecerán
    // cuando el creador ejecute la migración controlada a Storage.
    fotos: (combo.fotos ?? []).filter(esUrlPublica),
    activo: true,
  }));
}

export async function obtenerCatalogoPublico(cliente = supabase) {
  if (!cliente) throw new Error('Supabase no está configurado.');
  const { data, error } = await cliente.from(TABLA).select('id,nombre,descripcion,precio,fotos').eq('activo', true);
  if (error) throw error;
  return (data ?? []).map((combo) => ({ ...combo, precio: Number(combo.precio), fotos: combo.fotos ?? [] }))
    .sort((a, b) => a.id.localeCompare(b.id, 'es-AR', { numeric: true }));
}

export async function sincronizarCatalogoPublico(db, cliente = supabase) {
  if (!supabaseConfigurado || db?.tipo !== 'supabase') return { publicados: 0, desactivados: 0 };
  invalidarCatalogo();
  const parametros = await obtenerParametrosVigentes(db);
  const [catalogo, insumos] = await Promise.all([
    obtenerCatalogo(db, parametros),
    obtenerTodos(db, TIENDAS.INSUMOS),
  ]);
  const filas = construirCatalogoPublico(catalogo, insumos);
  if (filas.length > 0) {
    const { error } = await cliente.from(TABLA).upsert(filas);
    if (error) throw error;
  }
  const { data: existentes, error: errorLectura } = await cliente.from(TABLA).select('id');
  if (errorLectura) throw errorLectura;
  const vigentes = new Set(filas.map((fila) => fila.id));
  const obsoletos = (existentes ?? []).map((fila) => String(fila.id)).filter((id) => !vigentes.has(id));
  if (obsoletos.length > 0) {
    const { error } = await cliente.from(TABLA).update({ activo: false }).in('id', obsoletos);
    if (error) throw error;
  }
  return { publicados: filas.length, desactivados: obsoletos.length };
}
