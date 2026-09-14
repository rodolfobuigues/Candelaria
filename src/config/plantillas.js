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
  return globalThis.localStorage?.getItem(`candelaria-plantilla-${id}`) ?? PLANTILLAS_INICIALES[id];
}

export function guardarPlantilla(id, texto) {
  globalThis.localStorage?.setItem(`candelaria-plantilla-${id}`, texto);
}
