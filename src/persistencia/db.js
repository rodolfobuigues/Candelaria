// Adaptador de IndexedDB — capa fina sobre la API nativa del navegador.
// No contiene reglas de negocio: eso vive en pedidoLogica.js y en el motor.
// Usa siempre el `indexedDB` global (el del navegador en producción; en los
// tests, el de fake-indexeddb).
import { NOMBRE_DB, VERSION_DB, migrar } from './esquema.js';
import { supabase, supabaseConfigurado } from '../config/supabase.js';

const TABLAS = {
  insumos: 'insumos',
  productos: 'productos',
  combos: 'combos',
  parametros: 'parametros',
  pedidos: 'pedidos',
};

function remoto(db) {
  return db?.tipo === 'supabase';
}

function aFila(tienda, registro) {
  if (tienda === 'insumos') return { id: registro.id, codigo: registro.codigo, nombre: registro.nombre, categoria: registro.categoria, unidad: registro.unidad, monto_compra: registro.montoCompra, cantidad_compra: registro.cantidadCompra, activo: registro.activo };
  if (tienda === 'productos') return { id: registro.id, codigo: registro.codigo, nombre: registro.nombre, categoria: registro.categoria, cera_alto_pf: registro.ceraAltoPF, cera_bajo_pf: registro.ceraBajoPF, pabilo: registro.pabilo, yeso: registro.yeso, minutos_mano_obra: registro.minutosManoObra, recipiente_costo: registro.recipienteCosto, recipiente_cantidad: registro.recipienteCantidad, hereda_costo_de: registro.heredaCostoDe, extras: registro.extras ?? [], fotos: registro.fotos ?? [], activo: registro.activo };
  if (tienda === 'combos') return { id: registro.id, nombre: registro.nombre, lineas: registro.lineas ?? [], fotos: registro.fotos ?? [], activo: registro.activo };
  if (tienda === 'parametros') return { id: registro.id, datos: { ...registro, id: undefined } };
  return { id: registro.id, numero: registro.numero, fecha: registro.fecha, cliente_nombre: registro.clienteNombre, cliente_telefono: registro.clienteTelefono, nota_interna: registro.notaInterna, estado_entrega: registro.estadoEntrega, lineas: registro.lineas ?? [], pagos: registro.pagos ?? [], historial: registro.historial ?? [] };
}

function desdeFila(tienda, fila) {
  if (tienda === 'insumos') return { id: fila.id, codigo: fila.codigo, nombre: fila.nombre, categoria: fila.categoria, unidad: fila.unidad, montoCompra: Number(fila.monto_compra), cantidadCompra: Number(fila.cantidad_compra), activo: fila.activo };
  if (tienda === 'productos') return { id: fila.id, codigo: fila.codigo, nombre: fila.nombre, categoria: fila.categoria, ceraAltoPF: Number(fila.cera_alto_pf), ceraBajoPF: Number(fila.cera_bajo_pf), pabilo: Number(fila.pabilo), yeso: Number(fila.yeso), minutosManoObra: Number(fila.minutos_mano_obra), recipienteCosto: Number(fila.recipiente_costo), recipienteCantidad: Number(fila.recipiente_cantidad), heredaCostoDe: fila.hereda_costo_de, extras: fila.extras ?? [], fotos: fila.fotos ?? [], activo: fila.activo };
  if (tienda === 'combos') return { id: fila.id, nombre: fila.nombre, lineas: fila.lineas ?? [], fotos: fila.fotos ?? [], activo: fila.activo };
  if (tienda === 'parametros') return { ...(fila.datos ?? {}), id: fila.id };
  return { id: fila.id, numero: fila.numero, fecha: fila.fecha, clienteNombre: fila.cliente_nombre, clienteTelefono: fila.cliente_telefono, notaInterna: fila.nota_interna, estadoEntrega: fila.estado_entrega, lineas: fila.lineas ?? [], pagos: fila.pagos ?? [], historial: fila.historial ?? [] };
}

export function abrirDB() {
  if (supabaseConfigurado) return Promise.resolve({ tipo: 'supabase' });
  return new Promise((resolve, reject) => {
    const solicitud = globalThis.indexedDB.open(NOMBRE_DB, VERSION_DB);
    solicitud.onupgradeneeded = () => migrar(solicitud.result);
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

export function obtenerTodos(db, tienda) {
  if (remoto(db)) return supabase.from(TABLAS[tienda]).select('*').then(({ data, error }) => { if (error) throw error; return data.map((fila) => desdeFila(tienda, fila)); });
  return new Promise((resolve, reject) => {
    const solicitud = db.transaction(tienda, 'readonly').objectStore(tienda).getAll();
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

export function obtenerPorId(db, tienda, id) {
  if (remoto(db)) return supabase.from(TABLAS[tienda]).select('*').eq('id', id).maybeSingle().then(({ data, error }) => { if (error) throw error; return data ? desdeFila(tienda, data) : null; });
  return new Promise((resolve, reject) => {
    const solicitud = db.transaction(tienda, 'readonly').objectStore(tienda).get(id);
    solicitud.onsuccess = () => resolve(solicitud.result ?? null);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

export function guardar(db, tienda, registro) {
  if (remoto(db)) return supabase.from(TABLAS[tienda]).upsert(aFila(tienda, registro)).then(({ error }) => { if (error) throw error; return registro; });
  return new Promise((resolve, reject) => {
    const solicitud = db.transaction(tienda, 'readwrite').objectStore(tienda).put(registro);
    solicitud.onsuccess = () => resolve(registro);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

export function eliminarTodo(db, tienda) {
  if (remoto(db)) return supabase.from(TABLAS[tienda]).delete().neq('id', '').then(({ error }) => { if (error) throw error; });
  return new Promise((resolve, reject) => {
    const solicitud = db.transaction(tienda, 'readwrite').objectStore(tienda).clear();
    solicitud.onsuccess = () => resolve();
    solicitud.onerror = () => reject(solicitud.error);
  });
}
