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

function precioPublico(valor, id) {
  const precio = Number(valor);
  if (!['number', 'string'].includes(typeof valor) || (typeof valor === 'string' && !valor.trim()) || !Number.isFinite(precio) || precio < 0) throw new Error(`El precio público del combo ${id} no es válido.`);
  return precio;
}

export function sugerirDescripcionComercial(combo, productos = []) {
  const productosPorId = new Map(productos.map((producto) => [String(producto.id), producto]));
  return (combo.lineas ?? []).filter((linea) => linea.tipo === 'PRODUCTO')
    .map((linea) => {
      const producto = productosPorId.get(String(linea.refId));
      return producto ? `${formatearCantidad(linea.cantidad)} × ${producto.nombre}` : '';
    }).filter(Boolean).join(', ');
}

export function normalizarBusqueda(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es-AR');
}

export function telefonoComercialPublico(telefono) {
  const digitos = String(telefono ?? '').replace(/[\s()+-]/g, '');
  return /^\d{8,15}$/.test(digitos) ? digitos : '';
}

export function construirCatalogoPublico(catalogo, _insumos = [], parametros = {}, { vistaPrevia = false } = {}) {
  const productosPorId = new Map(catalogo.productos.map((producto) => [String(producto.id), producto]));
  return catalogo.combos.filter((combo) => combo.activo !== false).map((combo) => ({
    id: String(combo.id),
    nombre: combo.nombreComercial?.trim() || combo.nombre,
    descripcion: combo.descripcionComercial?.trim() || sugerirDescripcionComercial(combo, [...productosPorId.values()]),
    precio: precioPublico(combo.precioCombo, combo.id),
    // No duplica imágenes Base64 en la tabla pública. Esas fotos aparecerán
    // cuando el creador ejecute la migración controlada a Storage.
    fotos: (combo.fotos ?? []).filter((foto) => esUrlPublica(foto) || (vistaPrevia && /^data:image\//i.test(foto))),
    activo: true,
    telefono_comercial: telefonoComercialPublico(parametros.telefonoComercial),
  }));
}

export async function obtenerCatalogoPublico(cliente = supabase) {
  if (!cliente) throw new Error('Supabase no está configurado.');
  const { data, error } = await cliente.from(TABLA).select('id,nombre,descripcion,precio,fotos,telefono_comercial').eq('activo', true);
  if (error) throw error;
  return (data ?? []).map((combo) => ({ ...combo, precio: precioPublico(combo.precio, combo.id), fotos: combo.fotos ?? [] }))
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
  const filas = construirCatalogoPublico(catalogo, insumos, parametros);
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
