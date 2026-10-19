import { obtenerParametrosVigentes, guardarParametros } from './parametrosRepo.js';

export const MARCADORES = ['{cliente}', '{numero}', '{fecha}', '{detalle}', '{total}', '{pagado}', '{saldo}', '{montoPago}', '{medioPago}', '{motivo}'];
export const PLANTILLAS_INICIALES = {
  confirmacion: '¡Hola {cliente}! Tu pedido #{numero} fue confirmado 🕯️\n\n{detalle}\n\nTotal: {total}\nSeña recibida: {pagado}\nSaldo: {saldo}\n\n¡Gracias por elegir Candelaria!',
  pago: '¡Hola {cliente}! Registré tu pago de {montoPago} por {medioPago} para el pedido #{numero}.\nTotal abonado: {pagado}.\nSaldo pendiente: {saldo}. ¡Gracias!',
  pago_anulado: 'Hola {cliente}, corregimos el pago de {montoPago} por {medioPago} del pedido #{numero}.\nMotivo: {motivo}.\nTotal abonado actualizado: {pagado}.\nSaldo pendiente: {saldo}.',
  recordatorio: 'Hola {cliente}, te recuerdo que tu pedido #{numero} tiene un saldo pendiente de {saldo}.',
  entrega: 'Hola {cliente}, confirmamos la entrega de tu pedido #{numero}. ¡Muchas gracias por tu compra!',
  entrega_corregida: 'Hola {cliente}, corregimos el estado del pedido #{numero}: continúa pendiente de entrega.\nMotivo: {motivo}.',
};

export function obtenerPlantilla(id) {
  return PLANTILLAS_INICIALES[id];
}

export function obtenerPlantillaLocalAnterior(id) {
  try { return globalThis.localStorage?.getItem(`candelaria-plantilla-${id}`) ?? null; }
  catch { return null; }
}

export async function cargarPlantilla(db, id) {
  if (!Object.hasOwn(PLANTILLAS_INICIALES, id)) throw new Error('No existe esa plantilla.');
  const parametros = await obtenerParametrosVigentes(db);
  return parametros.plantillas?.[id] ?? obtenerPlantillaLocalAnterior(id) ?? PLANTILLAS_INICIALES[id];
}

export async function guardarPlantilla(db, id, texto) {
  if (!Object.hasOwn(PLANTILLAS_INICIALES, id) || typeof texto !== 'string' || !texto.trim()) throw new Error('La plantilla debe tener texto.');
  if (texto.length > 20000) throw new Error('La plantilla supera los 20.000 caracteres.');
  if (texto.includes('{nota}')) throw new Error('La nota es interna y no puede incluirse en una plantilla.');
  const parametros = await obtenerParametrosVigentes(db);
  await guardarParametros(db, { ...parametros, plantillas: { ...(parametros.plantillas ?? {}), [id]: texto } });
  // El registro anterior se conserva como copia local de transición. Nunca
  // sobrescribe una plantilla central existente ni se sube automáticamente.
  return texto;
}
