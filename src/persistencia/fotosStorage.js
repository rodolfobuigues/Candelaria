import { supabase, supabaseConfigurado } from '../config/supabase.js';
import { obtenerTodos, guardar } from './db.js';
import { TIENDAS } from './esquema.js';

const BUCKET = 'catalogo';

export function esFotoBase64(foto) {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(String(foto ?? ''));
}

function datosDeFoto(foto) {
  const coincidencia = String(foto).match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is);
  if (!coincidencia) throw new Error('La foto no tiene un formato Base64 válido.');
  const [, mime, base64] = coincidencia;
  const binario = globalThis.atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let indice = 0; indice < binario.length; indice += 1) bytes[indice] = binario.charCodeAt(indice);
  return { mime, blob: new Blob([bytes], { type: mime }) };
}

function huella(texto) {
  let valor = 2166136261;
  for (let indice = 0; indice < texto.length; indice += 1) {
    valor ^= texto.charCodeAt(indice);
    valor = Math.imul(valor, 16777619);
  }
  return (valor >>> 0).toString(16).padStart(8, '0');
}

function segmentoSeguro(valor) {
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'sin-id';
}

async function subirFoto(cliente, tipo, registroId, foto) {
  const { mime, blob } = datosDeFoto(foto);
  const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1].replace('+xml', '');
  const ruta = `${tipo}/${segmentoSeguro(registroId)}/${huella(foto)}.${extension}`;
  const bucket = cliente.storage.from(BUCKET);
  const { error } = await bucket.upload(ruta, blob, { contentType: mime, upsert: true });
  if (error) throw new Error(`No se pudo subir ${ruta}: ${error.message}`);
  const { data } = bucket.getPublicUrl(ruta);
  if (!data?.publicUrl) throw new Error(`Storage no devolvió la URL pública de ${ruta}.`);
  return data.publicUrl;
}

export function revisarFotosCatalogo(productos, combos) {
  const registros = [
    ...productos.map((registro) => ({ ...registro, tipo: 'productos' })),
    ...combos.map((registro) => ({ ...registro, tipo: 'combos' })),
  ];
  const conBase64 = registros.filter((registro) => (registro.fotos ?? []).some(esFotoBase64));
  return {
    registrosTotales: registros.length,
    registrosPendientes: conBase64.length,
    fotosBase64: conBase64.reduce((total, registro) => total + registro.fotos.filter(esFotoBase64).length, 0),
    fotosConUrl: registros.reduce((total, registro) => total + (registro.fotos ?? []).filter((foto) => !esFotoBase64(foto)).length, 0),
  };
}

export async function guardarFotosEnStorage(registro, tipo, cliente = supabase) {
  const fotos = registro.fotos ?? [];
  if (!fotos.some(esFotoBase64)) return registro;
  if (!cliente) throw new Error('Supabase Storage no está configurado.');

  // Se suben todas antes de devolver el registro con URL. Si una falla, quien
  // llamó a esta función todavía conserva intacto el registro con Base64.
  const migradas = [];
  for (const foto of fotos) {
    migradas.push(esFotoBase64(foto) ? await subirFoto(cliente, tipo, registro.id, foto) : foto);
  }
  return { ...registro, fotos: migradas };
}

export async function revisarMigracionFotos(db) {
  const [productos, combos] = await Promise.all([
    obtenerTodos(db, TIENDAS.PRODUCTOS),
    obtenerTodos(db, TIENDAS.COMBOS),
  ]);
  return revisarFotosCatalogo(productos, combos);
}

export async function migrarFotosCatalogo(db, alProgreso = null) {
  if (!supabaseConfigurado || db?.tipo !== 'supabase') throw new Error('La migración de fotos solo está disponible con Supabase configurado.');
  const colecciones = [
    ['productos', TIENDAS.PRODUCTOS, await obtenerTodos(db, TIENDAS.PRODUCTOS)],
    ['combos', TIENDAS.COMBOS, await obtenerTodos(db, TIENDAS.COMBOS)],
  ];
  const pendientes = colecciones.flatMap(([tipo, tienda, registros]) => registros.filter((registro) => (registro.fotos ?? []).some(esFotoBase64)).map((registro) => ({ tipo, tienda, registro })));
  let migrados = 0;
  let fotosMigradas = 0;

  for (const { tipo, tienda, registro } of pendientes) {
    const cantidad = registro.fotos.filter(esFotoBase64).length;
    const actualizado = await guardarFotosEnStorage(registro, tipo);
    await guardar(db, tienda, actualizado);
    migrados += 1;
    fotosMigradas += cantidad;
    alProgreso?.({ migrados, total: pendientes.length, fotosMigradas });
  }
  return { registrosMigrados: migrados, fotosMigradas };
}
