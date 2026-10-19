// Adaptador de IndexedDB — capa fina sobre la API nativa del navegador.
// No contiene reglas de negocio: eso vive en pedidoLogica.js y en el motor.
// Usa siempre el `indexedDB` global (el del navegador en producción; en los
// tests, el de fake-indexeddb).
import { NOMBRE_DB, VERSION_DB, migrar } from './esquema.js';
import { supabase, supabaseConfigurado } from '../config/supabase.js';
import { ENTIDADES_EXCEL, firmaEstadoExcel, ordenarJSON } from './excelContrato.js';
import { validarRegistro } from './validacionDominio.js';

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

export function aFila(tienda, registro) {
  if (tienda === 'insumos') return { id: registro.id, codigo: registro.codigo, nombre: registro.nombre, categoria: registro.categoria, unidad: registro.unidad, monto_compra: registro.montoCompra, cantidad_compra: registro.cantidadCompra, activo: registro.activo, rol_motor: registro.rolMotor || null };
  if (tienda === 'productos') return { id: registro.id, codigo: registro.codigo, nombre: registro.nombre, categoria: registro.categoria, cera_alto_pf: registro.ceraAltoPF, cera_bajo_pf: registro.ceraBajoPF, pabilo: registro.pabilo, yeso: registro.yeso, minutos_mano_obra: registro.minutosManoObra, recipiente_costo: registro.recipienteCosto, recipiente_cantidad: registro.recipienteCantidad, hereda_costo_de: registro.heredaCostoDe, extras: registro.extras ?? [], fotos: registro.fotos ?? [], activo: registro.activo };
  if (tienda === 'combos') return { id: registro.id, nombre: registro.nombre, nombre_comercial: registro.nombreComercial ?? '', descripcion_comercial: registro.descripcionComercial ?? '', lineas: registro.lineas ?? [], fotos: registro.fotos ?? [], activo: registro.activo };
  if (tienda === 'parametros') return { id: registro.id, datos: { ...registro, id: undefined } };
  return { id: registro.id, numero: registro.numero, fecha: registro.fecha, cliente_nombre: registro.clienteNombre, cliente_telefono: registro.clienteTelefono ?? '', nota_interna: registro.notaInterna ?? '', estado_entrega: registro.estadoEntrega, lineas: registro.lineas ?? [], pagos: registro.pagos ?? [], historial: registro.historial ?? [], revision: registro.revision ?? 0 };
}

export function desdeFila(tienda, fila) {
  if (tienda === 'insumos') return { id: fila.id, codigo: fila.codigo, nombre: fila.nombre, categoria: fila.categoria, unidad: fila.unidad, montoCompra: Number(fila.monto_compra), cantidadCompra: Number(fila.cantidad_compra), activo: fila.activo, ...(fila.rol_motor ? { rolMotor: fila.rol_motor } : {}) };
  if (tienda === 'productos') return { id: fila.id, codigo: fila.codigo, nombre: fila.nombre, categoria: fila.categoria, ceraAltoPF: Number(fila.cera_alto_pf), ceraBajoPF: Number(fila.cera_bajo_pf), pabilo: Number(fila.pabilo), yeso: Number(fila.yeso), minutosManoObra: Number(fila.minutos_mano_obra), recipienteCosto: Number(fila.recipiente_costo), recipienteCantidad: Number(fila.recipiente_cantidad), heredaCostoDe: fila.hereda_costo_de, extras: fila.extras ?? [], fotos: fila.fotos ?? [], activo: fila.activo };
  if (tienda === 'combos') return { id: fila.id, nombre: fila.nombre, nombreComercial: fila.nombre_comercial ?? '', descripcionComercial: fila.descripcion_comercial ?? '', lineas: fila.lineas ?? [], fotos: fila.fotos ?? [], activo: fila.activo };
  if (tienda === 'parametros') return { ...(fila.datos ?? {}), id: fila.id };
  return { id: fila.id, numero: fila.numero, fecha: fila.fecha, clienteNombre: fila.cliente_nombre, clienteTelefono: fila.cliente_telefono, notaInterna: fila.nota_interna, estadoEntrega: fila.estado_entrega, lineas: fila.lineas ?? [], pagos: fila.pagos ?? [], historial: fila.historial ?? [], revision: fila.revision ?? 0 };
}

export function abrirDB() {
  if (supabaseConfigurado) return Promise.resolve({ tipo: 'supabase' });
  return new Promise((resolve, reject) => {
    const solicitud = globalThis.indexedDB.open(NOMBRE_DB, VERSION_DB);
    solicitud.onupgradeneeded = () => migrar(solicitud.result, solicitud.transaction);
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

// Las altas de la interfaz nunca usan upsert: una colisión no sobrescribe nada.
export async function crear(db, tienda, registro) {
  if (tienda === 'insumos' && !registro.rolMotor) { registro = { ...registro }; delete registro.rolMotor; }
  validarRegistro(tienda, registro);
  if (remoto(db)) {
    const { error } = await supabase.from(TABLAS[tienda]).insert(aFila(tienda, registro));
    if (error?.code === '23505') throw new Error('Ese código, identificador o rol ya existe. El registro original no fue modificado.');
    if (error) throw error;
    return registro;
  }
  return escribirExistencia(db, tienda, registro, false);
}

export async function actualizar(db, tienda, registro) {
  if (tienda === 'insumos' && !registro.rolMotor) { registro = { ...registro }; delete registro.rolMotor; }
  validarRegistro(tienda, registro);
  if (remoto(db)) {
    const { data, error } = await supabase.from(TABLAS[tienda]).update(aFila(tienda, registro)).eq('id', registro.id).select('id');
    if (error?.code === '23505') throw new Error('Ese código o rol ya existe. No se guardaron los cambios.');
    if (error) throw error;
    if (!data?.length) throw new Error('El registro ya no existe. Actualizá la pantalla.');
    return registro;
  }
  return escribirExistencia(db, tienda, registro, true);
}

function escribirExistencia(db, tienda, registro, debeExistir) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(tienda, 'readwrite'); let errorPropio;
    tx.oncomplete = () => resolve(registro);
    tx.onabort = tx.onerror = () => reject(errorPropio ?? new Error('Ese código, identificador o rol ya existe. No se modificó el registro original.'));
    const store = tx.objectStore(tienda); const solicitud = store.get(registro.id);
    solicitud.onsuccess = () => {
      if (Boolean(solicitud.result) !== debeExistir) {
        errorPropio = new Error(debeExistir ? 'El registro ya no existe. Actualizá la pantalla.' : 'Ese código o identificador ya existe. El registro original no fue modificado.');
        tx.abort(); return;
      }
      if (debeExistir) store.put(registro); else store.add(registro);
    };
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

export function eliminarPorId(db, tienda, id) {
  if (remoto(db)) return supabase.from(TABLAS[tienda]).delete().eq('id', id).then(({ error }) => { if (error) throw error; });
  return new Promise((resolve, reject) => {
    const solicitud = db.transaction(tienda, 'readwrite').objectStore(tienda).delete(id);
    solicitud.onsuccess = () => resolve();
    solicitud.onerror = () => reject(solicitud.error);
  });
}

const CONFLICTO_PEDIDO = 'El pedido cambió en otra sesión. Volvé a abrirlo y revisá los pagos antes de reintentar; no se perdió ningún pago guardado.';

export async function persistirPedidoAtomico(db, pedido, { numerar = false, cliente = supabase } = {}) {
  if (remoto(db)) {
    const { data, error } = await cliente.rpc('guardar_pedido_seguro', { p_pedido: aFila('pedidos', pedido), p_revision: pedido.revision ?? 0, p_nuevo: numerar });
    if (error?.code === 'PGRST202' || error?.code === '42883') throw new Error('Falta instalar supabase/seguridad_datos.sql. No se guardó el pedido.');
    if (error) throw new Error(error.message);
    return desdeFila('pedidos', data);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pedidos', 'readwrite'); const store = tx.objectStore('pedidos');
    let resultado; let errorPropio;
    tx.oncomplete = () => resolve(resultado);
    tx.onabort = tx.onerror = () => reject(errorPropio ?? tx.error ?? new Error('No se pudo guardar el pedido.'));
    const solicitud = numerar ? store.getAll() : store.get(pedido.id);
    solicitud.onsuccess = () => {
      try {
        if (numerar) {
          if (solicitud.result.some((previo) => previo.id === pedido.id)) throw new Error('Este pedido ya fue guardado. Volvé a la lista de pedidos.');
          const numero = Math.max(0, ...solicitud.result.map((previo) => previo.numero)) + 1;
          resultado = { ...pedido, numero, revision: 0, historial: pedido.historial.map((evento) => evento.tipo === 'CREADO' ? { ...evento, descripcion: `Pedido #${numero} creado para ${pedido.clienteNombre}.` } : evento) };
          validarRegistro('pedidos', resultado); store.add(resultado);
        } else {
          const previo = solicitud.result;
          if (previo && (previo.revision ?? 0) !== (pedido.revision ?? 0)) throw new Error(CONFLICTO_PEDIDO);
          if (!previo && pedido.revision !== undefined) throw new Error('El pedido ya no existe. Volvé a la lista de pedidos.');
          resultado = { ...pedido, revision: previo ? (previo.revision ?? 0) + 1 : 0 };
          validarRegistro('pedidos', resultado);
          if (previo) store.put(resultado); else store.add(resultado);
        }
      } catch (error) { errorPropio = error; tx.abort(); }
    };
  });
}

function firmaCompleta(estado) {
  return JSON.stringify(ordenarJSON(Object.fromEntries(Object.keys(TABLAS).map((clave) => [clave, Object.fromEntries(estado[clave].map((registro) => [registro.id, registro]))]))));
}

// Sustituye todas las colecciones o ninguna; compara el estado previo dentro
// de la transacción. La descarga/subida de medios ocurre antes de esta llamada.
export async function restaurarEstadoAtomico(db, destino, previo, cliente = supabase) {
  const claves = Object.keys(TABLAS);
  if (remoto(db)) {
    const filas = (estado) => Object.fromEntries(claves.map((clave) => [clave, Object.fromEntries(estado[clave].map((registro) => [registro.id, aFila(clave, registro)]))]));
    const { error } = await cliente.rpc('restaurar_respaldo_seguro', { p_estado: filas(previo), p_destino: Object.fromEntries(claves.map((clave) => [clave, destino[clave].map((registro) => aFila(clave, registro))])) });
    if (error?.code === 'PGRST202' || error?.code === '42883') throw new Error('Falta instalar supabase/seguridad_datos.sql. No se modificó ningún dato.');
    if (error) throw new Error(error.message);
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(claves, 'readwrite'); let pendientes = claves.length; let errorPropio; const actual = {};
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(errorPropio ?? new Error(`La importación falló y se restauró el estado anterior: ${tx.error?.message ?? 'operación cancelada'}`));
    for (const clave of claves) {
      const solicitud = tx.objectStore(clave).getAll();
      solicitud.onsuccess = () => {
        actual[clave] = solicitud.result; pendientes -= 1;
        if (pendientes) return;
        if (firmaCompleta(actual) !== firmaCompleta(previo)) {
          errorPropio = new Error('Los datos cambiaron durante la preparación del respaldo. Volvé a revisar; no se modificó ningún dato.'); tx.abort(); return;
        }
        for (const tienda of claves) {
          const store = tx.objectStore(tienda); store.clear();
          for (const registro of destino[tienda]) store.add(registro);
        }
      };
    }
  });
}

// La importación Excel solo agrega o actualiza; nunca elimina registros.
// Compara el estado revisado dentro de la misma transacción que lo escribe.
export function aplicarCambiosExcelAtomicos(db, cambios, previo, cliente = supabase) {
  const claves = ENTIDADES_EXCEL.map(([, clave]) => clave);
  if (cambios.some((cambio) => !claves.includes(cambio.clave) || !cambio.registro?.id)) return Promise.reject(new Error('La importación contiene una colección o un id no admitido.'));
  const resultado = { nuevos: cambios.filter((cambio) => cambio.nuevo).length, modificados: cambios.filter((cambio) => !cambio.nuevo).length };
  if (cambios.length === 0) return Promise.resolve(resultado);
  if (remoto(db)) {
    const estado = Object.fromEntries(claves.map((clave) => [clave, Object.fromEntries(previo[clave].map((registro) => [registro.id, aFila(clave, registro)]))]));
    const destino = Object.fromEntries(claves.map((clave) => [clave, cambios.filter((cambio) => cambio.clave === clave).map((cambio) => aFila(clave, cambio.registro))]));
    return cliente.rpc('aplicar_intercambio_excel', { p_estado: estado, p_cambios: destino }).then(({ error }) => {
      if (error?.code === 'PGRST202' || error?.code === '42883') throw new Error('Falta instalar supabase/intercambio_excel.sql en Supabase. No se modificó ningún dato.');
      if (error) throw new Error(error.message);
      return resultado;
    });
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(claves, 'readwrite');
    const actual = {}; let pendientes = claves.length; let errorPropio = null;
    tx.oncomplete = () => resolve(resultado);
    tx.onerror = tx.onabort = () => reject(errorPropio ?? tx.error ?? new Error('La importación fue cancelada sin aplicar cambios.'));
    for (const clave of claves) {
      const solicitud = tx.objectStore(clave).getAll();
      solicitud.onsuccess = () => {
        actual[clave] = solicitud.result; pendientes -= 1;
        if (pendientes !== 0) return;
        if (firmaEstadoExcel(actual) !== firmaEstadoExcel(previo)) {
          errorPropio = new Error('Los datos cambiaron desde la revisión. Volvé a revisar el archivo; no se aplicó ningún cambio.');
          tx.abort(); return;
        }
        for (const cambio of cambios) tx.objectStore(cambio.clave).put(cambio.registro);
      };
    }
  });
}
