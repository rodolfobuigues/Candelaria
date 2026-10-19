// Respaldo autocontenido: fotos descargadas y registros en una transacción.
import { TIENDAS } from './esquema.js';
import { obtenerTodos, restaurarEstadoAtomico } from './db.js';
import { calcularDerivados } from './pedidoLogica.js';
import { validarEstado } from './validacionDominio.js';
import { guardarFotosEnStorage, esFotoBase64 } from './fotosStorage.js';
import { calcularCatalogoDesdeDatos } from './catalogoRepo.js';
import { PARAMETROS_INICIALES } from '../config/parametros.js';

export const VERSION_RESPALDO = 1;
const CLAVES = Object.values(TIENDAS);

export function validarRespaldo(respaldo) {
  if (!respaldo || typeof respaldo !== 'object') throw new Error('El respaldo no contiene un objeto válido.');
  if (respaldo.version !== VERSION_RESPALDO) throw new Error(`La versión del respaldo debe ser ${VERSION_RESPALDO}.`);
  for (const clave of CLAVES) if (!Array.isArray(respaldo[clave])) throw new Error(`El respaldo no contiene la colección ${clave}.`);
  validarEstado(respaldo);
  const parametros = { ...PARAMETROS_INICIALES, ...respaldo.parametros.find((registro) => registro.id === 'actuales') };
  calcularCatalogoDesdeDatos(respaldo, parametros);
  if (respaldo.medios !== undefined) {
    if (!Array.isArray(respaldo.medios)) throw new Error('La colección de fotos del respaldo no es válida.');
    const urls = new Set();
    for (const medio of respaldo.medios) {
      if (!medio || !/^https?:\/\//i.test(medio.url) || !esFotoBase64(medio.datos) || urls.has(medio.url)) throw new Error('El respaldo contiene una foto inválida o repetida.');
      urls.add(medio.url);
    }
    for (const clave of ['productos', 'combos']) for (const registro of respaldo[clave]) for (const foto of registro.fotos ?? []) {
      if (!esFotoBase64(foto) && !urls.has(foto)) throw new Error(`Falta la copia de la foto del registro ${registro.id}.`);
    }
  }
  return respaldo;
}

async function leerEstado(db) {
  return Object.fromEntries(await Promise.all(CLAVES.map(async (clave) => [clave, await obtenerTodos(db, clave)])));
}

async function fotoEmbebida(url, descargar) {
  function errorFoto(mensaje) { const error = new Error(mensaje); error.codigo = 'FOTO_NO_DISPONIBLE'; return error; }
  let respuesta;
  try { respuesta = await descargar(url); } catch { throw errorFoto('No se pudo descargar una foto. El respaldo no se generó; reintentá con conexión.'); }
  if (!respuesta.ok) throw errorFoto('No se pudo descargar una foto. El respaldo no se generó completo.');
  const mime = respuesta.headers.get('content-type')?.split(';')[0];
  if (!/^image\/[a-z0-9.+-]+$/i.test(mime ?? '')) throw errorFoto('La respuesta de una foto no contiene una imagen válida.');
  const bytes = new Uint8Array(await respuesta.arrayBuffer());
  let binario = '';
  for (let inicio = 0; inicio < bytes.length; inicio += 8192) binario += String.fromCharCode(...bytes.subarray(inicio, inicio + 8192));
  return `data:${mime};base64,${globalThis.btoa(binario)}`;
}

export async function exportarRespaldo(db, { descargar = globalThis.fetch, incluirMedios = true } = {}) {
  const estado = await leerEstado(db);
  const urls = new Set(['productos', 'combos'].flatMap((clave) => estado[clave].flatMap((registro) => (registro.fotos ?? []).filter((foto) => !esFotoBase64(foto)))));
  const medios = [];
  if (incluirMedios) for (const url of urls) medios.push({ url, datos: await fotoEmbebida(url, descargar) });
  return { version: VERSION_RESPALDO, exportadoEn: new Date().toISOString(), ...estado, pedidos: estado.pedidos.map((pedido) => ({ ...pedido, ...calcularDerivados(pedido) })), ...(incluirMedios ? { medios } : {}) };
}

// Recuperar una foto eliminada no puede depender de volver a descargarla.
// La copia de emergencia conserva datos y referencias y declara su límite.
export async function crearCopiaPreviaRestauracion(db, opciones = {}) {
  try { return { respaldo: await exportarRespaldo(db, opciones), completo: true }; }
  catch (error) {
    if (error.codigo !== 'FOTO_NO_DISPONIBLE') throw error;
    const respaldo = await exportarRespaldo(db, { incluirMedios: false });
    return { completo: false, respaldo: { ...respaldo, advertenciaMedios: 'Copia de emergencia: conserva datos y URLs, sin copia de las fotos externas.' } };
  }
}

export async function importarRespaldo(db, respaldo) {
  validarRespaldo(respaldo);
  const previo = await leerEstado(db);
  const pedidosPrevios = new Map(previo.pedidos.map((pedido) => [pedido.id, pedido]));
  const fotos = new Map((respaldo.medios ?? []).map((medio) => [medio.url, medio.datos]));
  const destino = Object.fromEntries(CLAVES.map((clave) => [clave, respaldo[clave].map((registro) => {
    if (clave === 'pedidos') {
      const { total, pagado, saldo, estadoCobro, ...persistido } = registro;
      const actual = pedidosPrevios.get(registro.id);
      return actual ? { ...persistido, revision: Math.max(actual.revision ?? 0, persistido.revision ?? 0) + 1 } : persistido;
    }
    if (clave === 'productos' || clave === 'combos') return { ...registro, ...(registro.fotos ? { fotos: registro.fotos.map((foto) => fotos.get(foto) ?? foto) } : {}) };
    return registro;
  })]));
  if (db?.tipo === 'supabase') {
    // Storage no participa de la transacción SQL. Las rutas deterministas
    // permiten reintentar; nunca se borran objetos previos si falla la base.
    for (const clave of ['productos', 'combos']) for (let i = 0; i < destino[clave].length; i += 1) destino[clave][i] = await guardarFotosEnStorage(destino[clave][i], clave);
  }
  await restaurarEstadoAtomico(db, destino, previo);
}
