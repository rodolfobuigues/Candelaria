import { useState, useEffect } from 'preact/hooks';
const guardianes = new Set();
export function registrarGuarda(guarda) { guardianes.add(guarda); return () => guardianes.delete(guarda); }
export function puedeSalir() { return [...guardianes].every((guarda) => guarda()); }
export function leerRutaDelHash() { return globalThis.location.hash.replace(/^#\/?/, '') || 'catalogo'; }
export function decodificarSegmentoRuta(ruta) {
  const segmento = ruta.split('/')[1];
  if (!segmento) return null;
  try { return decodeURIComponent(segmento); } catch { return null; }
}
export function seccionDeRuta(ruta) {
  const base = ruta.split('?')[0];
  if (/^(productos|producto|combo|insumo)/.test(base)) return 'productos';
  if (/^(pedidos|pedido|pago|mensaje)/.test(base)) return 'pedidos';
  if (/^(ajustes|plantilla)/.test(base)) return 'ajustes';
  return 'vender';
}
let rutaAutorizada = null;
export function navegarA(ruta) {
  if (leerRutaDelHash() === ruta) return true;
  if (!puedeSalir()) return false;
  rutaAutorizada = ruta;
  globalThis.location.hash = `/${ruta}`;
  return true;
}
const suscriptores = new Set();
let rutaAceptada = null;
function alCambiarHash() {
  const siguiente = leerRutaDelHash();
  if (siguiente === rutaAceptada) return;
  if (rutaAutorizada !== siguiente && !puedeSalir()) { globalThis.location.replace(`#/${rutaAceptada}`); return; }
  rutaAutorizada = null;
  rutaAceptada = siguiente;
  for (const actualizar of suscriptores) actualizar(siguiente);
}
export function useRuta() {
  const [ruta, setRuta] = useState(leerRutaDelHash());
  useEffect(() => {
    if (!suscriptores.size) { rutaAceptada = leerRutaDelHash(); globalThis.addEventListener('hashchange', alCambiarHash); }
    suscriptores.add(setRuta);
    return () => { suscriptores.delete(setRuta); if (!suscriptores.size) globalThis.removeEventListener('hashchange', alCambiarHash); };
  }, []);
  return ruta;
}
