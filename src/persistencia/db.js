// Adaptador de IndexedDB — capa fina sobre la API nativa del navegador.
// No contiene reglas de negocio: eso vive en pedidoLogica.js y en el motor.
// Usa siempre el `indexedDB` global (el del navegador en producción; en los
// tests, el de fake-indexeddb).
import { NOMBRE_DB, VERSION_DB, migrar } from './esquema.js';

export function abrirDB() {
  return new Promise((resolve, reject) => {
    const solicitud = globalThis.indexedDB.open(NOMBRE_DB, VERSION_DB);
    solicitud.onupgradeneeded = () => migrar(solicitud.result);
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

export function obtenerTodos(db, tienda) {
  return new Promise((resolve, reject) => {
    const solicitud = db.transaction(tienda, 'readonly').objectStore(tienda).getAll();
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

export function obtenerPorId(db, tienda, id) {
  return new Promise((resolve, reject) => {
    const solicitud = db.transaction(tienda, 'readonly').objectStore(tienda).get(id);
    solicitud.onsuccess = () => resolve(solicitud.result ?? null);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

export function guardar(db, tienda, registro) {
  return new Promise((resolve, reject) => {
    const solicitud = db.transaction(tienda, 'readwrite').objectStore(tienda).put(registro);
    solicitud.onsuccess = () => resolve(registro);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

export function eliminarTodo(db, tienda) {
  return new Promise((resolve, reject) => {
    const solicitud = db.transaction(tienda, 'readwrite').objectStore(tienda).clear();
    solicitud.onsuccess = () => resolve();
    solicitud.onerror = () => reject(solicitud.error);
  });
}
