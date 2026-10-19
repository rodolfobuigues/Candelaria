export const CADUCIDAD_BORRADOR = 8 * 60 * 60 * 1000;
const PREFIJO = 'candelaria-borrador-venta-';
export const claveBorrador = (usuarioId) => `${PREFIJO}${usuarioId}`;
export function leerBorrador(almacen, usuarioId, ahora = Date.now()) {
  const clave = claveBorrador(usuarioId);
  try {
    const borrador = JSON.parse(almacen?.getItem(clave) ?? 'null');
    if (!borrador || borrador.usuarioId !== usuarioId || !Number.isFinite(borrador.caduca) || borrador.caduca <= ahora || borrador.caduca > ahora + CADUCIDAD_BORRADOR || !Array.isArray(borrador.lineas) || !borrador.cliente || ['nombre', 'telefono', 'nota'].some((campo) => typeof borrador.cliente[campo] !== 'string')) { almacen?.removeItem(clave); return null; }
    if (borrador.lineas.some((linea) => !linea.refId || !['PRODUCTO', 'COMBO'].includes(linea.tipo) || typeof linea.nombre !== 'string' || typeof linea.codigo !== 'string' || !Number.isFinite(linea.precioOriginal) || linea.precioOriginal < 0 || !Number.isFinite(linea.cantidad) || linea.cantidad <= 0 || !Number.isFinite(linea.precioAplicado) || linea.precioAplicado < 0)) { almacen?.removeItem(clave); return null; }
    return borrador;
  } catch { almacen?.removeItem(clave); return null; }
}
export function guardarBorrador(almacen, usuarioId, { lineas, cliente }, ahora = Date.now()) {
  if (!lineas.length && !Object.values(cliente).some(Boolean)) { almacen?.removeItem(claveBorrador(usuarioId)); return; }
  almacen?.setItem(claveBorrador(usuarioId), JSON.stringify({ usuarioId, lineas, cliente, caduca: ahora + CADUCIDAD_BORRADOR }));
}
export function borrarBorradores(almacen) {
  if (!almacen) return;
  for (let indice = almacen.length - 1; indice >= 0; indice--) { const clave = almacen.key(indice); if (clave?.startsWith(PREFIJO)) almacen.removeItem(clave); }
}

export function purgarBorradoresCaducados(almacen, ahora = Date.now()) {
  if (!almacen) return;
  for (let indice = almacen.length - 1; indice >= 0; indice--) {
    const clave = almacen.key(indice);
    if (!clave?.startsWith(PREFIJO)) continue;
    try { const dato = JSON.parse(almacen.getItem(clave)); if (!dato || !Number.isFinite(dato.caduca) || dato.caduca <= ahora) almacen.removeItem(clave); }
    catch { almacen.removeItem(clave); }
  }
}
